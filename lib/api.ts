import { getIdToken } from "./firebase";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://tutor-ai.up.railway.app";

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pilotai_session_id");
}

async function buildHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getIdToken();
  const headers: Record<string, string> = { ...extra };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const sessionId = getSessionId();
  if (sessionId) headers["x-session-id"] = sessionId;
  return headers;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const headers = await buildHeaders({ "Content-Type": "application/json" });
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const headers = await buildHeaders({ "Content-Type": "application/json" });
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function apiPostFormData<T = unknown>(
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<T> {
  const token = await getIdToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const sessionId = getSessionId();
  if (sessionId) headers["x-session-id"] = sessionId;

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}${path}`);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
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

export async function createSession(token: string) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ device_type: "web", device_name: "PilotAI Web" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? res.statusText);
  return data;
}

export async function registerUser(token: string, displayName: string) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ display_name: displayName }),
  });
  if (res.status === 409) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? res.statusText);
  return data;
}

export async function terminateSession() {
  const token = await getIdToken();
  const sessionId = getSessionId();
  if (!token || !sessionId) return;
  await fetch(`${BASE_URL}/api/v1/auth/session`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "x-session-id": sessionId,
    },
  }).catch(() => {});
}

export interface CreditBalance {
  balance: number;
  currency?: string;
}

export interface Document {
  id: string;
  title: string;
  status: "pending_embedding" | "ready" | "failed";
  created_at: string;
  page_count?: number;
  char_count?: number;
  word_count?: number;
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

export async function getDocuments(): Promise<{ documents: Document[] }> {
  return apiGet<{ documents: Document[] }>("/api/v1/documents");
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

export async function uploadText(body: { title: string; content: string }): Promise<{ document: Document }> {
  return apiPost<{ document: Document }>("/api/v1/upload/text", body);
}

export async function generateStudySet(body: {
  document_id: string;
  output_types: string[];
}): Promise<{ batch_id: string }> {
  return apiPost<{ batch_id: string }>("/api/v1/study-sets/generate", body);
}

export async function getBatchStatus(batchId: string): Promise<BatchStatus> {
  return apiGet<BatchStatus>(`/api/v1/study-sets/batch/${batchId}`);
}

export async function getOutputContent(outputId: string, type: string): Promise<unknown> {
  return apiGet<unknown>(`/api/v1/study-sets/output/${outputId}/${type}`);
}
