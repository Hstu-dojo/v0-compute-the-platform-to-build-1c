import { getIdToken } from "./firebase";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://tutor-ai.up.railway.app";

const ACCESS_TOKEN_KEY = "pilotai_access_token";
const REFRESH_TOKEN_KEY = "pilotai_refresh_token";
const TOKEN_EXPIRES_KEY = "pilotai_token_expires_at";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeTokens(auth: AuthTokens) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, auth.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, auth.refresh_token);
  localStorage.setItem(TOKEN_EXPIRES_KEY, auth.expires_at);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_KEY);
  localStorage.removeItem("pilotai_session_id");
}

function isTokenExpired(): boolean {
  if (typeof window === "undefined") return true;
  const exp = localStorage.getItem(TOKEN_EXPIRES_KEY);
  if (!exp) return true;
  return new Date(exp).getTime() - 30_000 < Date.now();
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data: AuthSessionResponse = await res.json();
    storeTokens(data.auth);
    if (data.session?.session_id && typeof window !== "undefined") {
      localStorage.setItem("pilotai_session_id", data.session.session_id);
    }
    return data.auth.access_token;
  } catch {
    return null;
  }
}

async function getValidAccessToken(): Promise<string | null> {
  let token = getAccessToken();
  if (token && !isTokenExpired()) return token;
  token = await refreshAccessToken();
  return token;
}

async function buildHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = { ...extra };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const headers = await buildHeaders({ "Content-Type": "application/json" });
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${newToken}` };
      return handleResponse<T>(await fetch(`${BASE_URL}${path}`, { headers: retryHeaders }));
    }
  }
  return handleResponse<T>(res);
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const headers = await buildHeaders({ "Content-Type": "application/json" });
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${newToken}` };
      return handleResponse<T>(await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: retryHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }));
    }
  }
  return handleResponse<T>(res);
}

export async function apiPostFormData<T = unknown>(
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<T> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}${path}`);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText) as T); }
        catch { reject(new Error("Invalid response")); }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err?.error?.message ?? xhr.statusText));
        } catch {
          reject(new Error(xhr.statusText));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const headers = await buildHeaders({ "Content-Type": "application/json" });
  const res = await fetch(`${BASE_URL}${path}`, { method: "DELETE", headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export interface AuthTokens {
  token_type: string;
  access_token: string;
  expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
}

export interface AuthSessionResponse {
  user: {
    id: string;
    firebase_uid: string;
    email: string;
    display_name: string;
    role: "student" | "admin";
    is_email_verified: boolean;
    last_login_at?: string | null;
  };
  session: {
    session_id: string;
    expires_at: string;
  };
  auth: AuthTokens;
  subscription: {
    plan: "free" | "pro";
    status: string;
    current_period_end: string | null;
    billing_interval: "monthly" | "yearly";
  };
  token_balance: number;
  is_new_user: boolean;
}

export async function createSession(firebaseIdToken: string): Promise<AuthSessionResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${firebaseIdToken}`,
    },
    body: JSON.stringify({ device_type: "web", device_name: "PilotAI Web" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? res.statusText);
  return data as AuthSessionResponse;
}

export async function terminateSession(): Promise<void> {
  const token = getAccessToken();
  if (!token) return;
  await fetch(`${BASE_URL}/api/v1/auth/session`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  }).catch(() => {});
}

export interface CreditBalance {
  balance: number;
  currency?: string;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  filename: string;
  contentHash: string;
  status: "pending_embedding" | "ready" | "failed";
  embeddingJobId?: string | null;
  r2Path?: string | null;
  pageCount?: number | null;
  characterCount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BatchJob {
  id: string;
  output_type: string;
  status: "queued" | "processing" | "completed" | "failed";
  output_id: string | null;
  error?: string | null;
}

export interface BatchStatus {
  batch_id: string;
  status: "processing" | "completed" | "partially_completed" | "failed";
  jobs: BatchJob[];
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface MCQOption {
  text: string;
  is_correct?: boolean;
}

export interface MCQQuestion {
  question: string;
  options: string[] | MCQOption[];
  correct_index?: number;
  correct_answer?: string;
  explanation?: string;
}

export interface FillBlankItem {
  sentence: string;
  blank?: string;
  answer: string;
  context?: string;
}

export async function getCredits(): Promise<CreditBalance> {
  return apiGet<CreditBalance>("/api/v1/credits/balance");
}

export async function getDocuments(): Promise<{ data: Document[]; next_cursor: string | null }> {
  return apiGet<{ data: Document[]; next_cursor: string | null }>("/api/v1/documents");
}

export async function getDocument(id: string): Promise<{ document: Document }> {
  return apiGet<{ document: Document }>(`/api/v1/documents/${id}`);
}

export async function uploadPdf(
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<{ document: Document }> {
  return apiPostFormData<{ document: Document }>("/api/v1/upload/pdf", formData, onProgress);
}

export async function uploadText(body: { title: string; text: string }): Promise<{ document: Document }> {
  return apiPost<{ document: Document }>("/api/v1/upload/text", body);
}

export async function generateStudySet(body: {
  document_id: string;
  types: string[];
}): Promise<{ batch_id: string }> {
  return apiPost<{ batch_id: string }>("/api/v1/study-sets/generate", body);
}

export async function getBatchStatus(batchId: string): Promise<BatchStatus> {
  return apiGet<BatchStatus>(`/api/v1/study-sets/batch/${batchId}`);
}

export async function getOutputContent(outputId: string, type: string): Promise<unknown> {
  return apiGet<unknown>(`/api/v1/study-sets/output/${outputId}/${type}`);
}
