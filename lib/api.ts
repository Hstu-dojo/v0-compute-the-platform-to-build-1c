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

export async function apiPatch<T = unknown>(path: string, body?: unknown): Promise<T> {
  const headers = await buildHeaders({ "Content-Type": "application/json" });
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${newToken}` };
      return handleResponse<T>(await fetch(`${BASE_URL}${path}`, {
        method: "PATCH",
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
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return handleResponse<T>(await fetch(`${BASE_URL}${path}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${newToken}` },
      }));
    }
  }
  return handleResponse<T>(res);
}

// ── Types ─────────────────────────────────────────────────────────────────────

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
    plan: string;
    status: string;
    current_period_end: string | null;
    billing_interval: "monthly";
  };
  token_balance: number;
  is_new_user: boolean;
}

export interface CreditBalance {
  balance: number;
  period_used?: number;
  currency?: string;
}

export interface CreditLedgerEntry {
  id: string;
  event_type: string;
  amount: number;
  balance_after: number;
  description?: string | null;
  created_at: string;
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

export type StudySetType = 
  | "notes" 
  | "content" 
  | "tutor_lesson" 
  | "flashcards" 
  | "multiple_choice" 
  | "fill_in_blanks" 
  | "written_test" 
  | "podcast";

export interface BatchJob {
  job_id: string;
  type: StudySetType;
  status: "queued" | "processing" | "completed" | "failed";
  output_id: string | null;
  error?: string | null;
  estimated_credits?: number | null;
  credits_consumed?: number | null;
  completed_at?: string | null;
}

export interface Batch {
  id: string;
  document_id: string;
  status: "processing" | "completed" | "failed" | "partial";
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  selected_types?: StudySetType[];
  estimated_credits?: number;
  created_at: string;
  completed_at?: string | null;
}

export interface StudySetGenerateResponse {
  batch: Batch;
  jobs: BatchJob[];
  websocket: {
    url: string;
    token: string;
    expires_in: number;
  };
}

export interface StudySetBatchStatusResponse {
  batch: Batch;
  jobs: BatchJob[];
}

export interface DocumentBatchesResponse {
  batches: StudySetBatchStatusResponse[];
  next_cursor?: string | null;
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

export interface Plan {
  id: string;
  code: string;
  name: string;
  monthly_credit_allotment: number;
  credits_rollover: boolean;
  price_monthly: number | null;
  currency?: string;
  is_active?: boolean;
  billing_intervals: string[];
}

export interface CreditPack {
  id: string;
  code: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  is_active?: boolean;
}

export interface Subscription {
  id: string;
  plan: {
    name: string;
    tier: string;
    monthly_credit_allotment: number;
    price_monthly: number | null;
    features: string[];
  };
  status: string;
  billing_interval: "monthly";
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at?: string | null;
  trial_end?: string | null;
}

export interface Invoice {
  id: string;
  stripe_invoice_id?: string;
  type: string;
  status: string | null;
  amount_paid: number;
  currency: string;
  credits_granted?: number | null;
  paid_at?: string | null;
  hosted_invoice_url?: string | null;
}

export interface AdminUser {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string;
  role: "student" | "admin";
  is_email_verified: boolean;
  is_active?: boolean;
  last_login_at?: string | null;
  created_at?: string;
  subscription?: { plan: string; status: string } | null;
  token_balance?: number;
}

export interface WorkerInfo {
  id: string;
  type?: string;
  last_heartbeat?: string | null;
  [key: string]: unknown;
}

export interface ModelConfig {
  id: string;
  task_type: string;
  provider: string;
  model_name: string;
  model_version?: string | null;
  fallback_model_name?: string | null;
  fallback_provider?: string | null;
  token_multiplier?: number | null;
  rollout_percentage?: number | null;
  is_active?: boolean;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function createSession(firebaseIdToken: string): Promise<AuthSessionResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${firebaseIdToken}`,
    },
    body: JSON.stringify({ 
      firebase_id_token: firebaseIdToken,
      device_type: "web", 
      device_name: "PilotAI Web" 
    }),
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

// ── Credits ───────────────────────────────────────────────────────────────────

export async function getCredits(): Promise<CreditBalance> {
  return apiGet<CreditBalance>("/api/v1/credits/balance");
}

export async function getCreditHistory(params?: {
  limit?: number;
  cursor?: string;
  event_type?: string;
}): Promise<{ data: CreditLedgerEntry[]; next_cursor: string | null }> {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.cursor) q.set("cursor", params.cursor);
  if (params?.event_type) q.set("event_type", params.event_type);
  const qs = q.toString();
  return apiGet<{ data: CreditLedgerEntry[]; next_cursor: string | null }>(
    `/api/v1/credits/history${qs ? `?${qs}` : ""}`
  );
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function getDocuments(): Promise<{ data: Document[]; next_cursor: string | null }> {
  return apiGet<{ data: Document[]; next_cursor: string | null }>("/api/v1/documents");
}

export async function getDocument(id: string): Promise<{ document: Document }> {
  return apiGet<{ document: Document }>(`/api/v1/documents/${id}`);
}

export async function deleteDocument(id: string): Promise<{ message: string; credits_refunded: number }> {
  return apiDelete<{ message: string; credits_refunded: number }>(`/api/v1/documents/${id}`);
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadPdf(
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<{ document: Document }> {
  return apiPostFormData<{ document: Document }>("/api/v1/upload/pdf", formData, onProgress);
}

export async function uploadText(body: { title: string; text: string }): Promise<{ document: Document }> {
  return apiPost<{ document: Document }>("/api/v1/upload/text", body);
}

// ── Study Sets ────────────────────────────────────────────────────────────────

export async function generateStudySet(body: {
  document_id: string;
  types: string[];
}): Promise<StudySetGenerateResponse> {
  return apiPost<StudySetGenerateResponse>("/api/v1/study-sets/generate", body);
}

export async function getBatchStatus(batchId: string): Promise<StudySetBatchStatusResponse> {
  return apiGet<StudySetBatchStatusResponse>(`/api/v1/study-sets/batch/${batchId}`);
}

export async function getDocumentBatches(documentId: string): Promise<DocumentBatchesResponse> {
  return apiGet<DocumentBatchesResponse>(`/api/v1/documents/${documentId}/batches`);
}

export async function getOutputContent(outputId: string, type: string): Promise<unknown> {
  return apiGet<unknown>(`/api/v1/study-sets/output/${outputId}/${type}`);
}

// ── Payments / Billing ────────────────────────────────────────────────────────

export async function getPlans(): Promise<{ data: Plan[] }> {
  return apiGet<{ data: Plan[] }>("/api/v1/payments/plans");
}

export async function getCreditPacks(): Promise<{ data: CreditPack[] }> {
  return apiGet<{ data: CreditPack[] }>("/api/v1/payments/packs");
}

export async function createCheckout(body: {
  plan_id: string;
  billing_interval: "monthly";
}): Promise<{ checkout_url: string; session_id: string; expires_at?: string | null }> {
  return apiPost("/api/v1/payments/create-checkout", body);
}

export async function buyTopup(body: {
  topup_pack_id: string;
}): Promise<{ checkout_url: string | null; session_id: string; expires_at?: string | null }> {
  return apiPost("/api/v1/payments/topup", body);
}

export async function getSubscription(): Promise<{ subscription: Subscription | null; invoices: Invoice[] }> {
  return apiGet("/api/v1/payments/subscription");
}

export async function cancelSubscription(): Promise<void> {
  await apiPost("/api/v1/payments/cancel-subscription");
}

// ── Admin — Users ─────────────────────────────────────────────────────────────

export async function adminGetUsers(params?: {
  limit?: number;
  cursor?: string;
  role?: string;
  plan?: string;
  is_active?: boolean;
  search?: string;
}): Promise<{ data: AdminUser[]; next_cursor: string | null }> {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.cursor) q.set("cursor", params.cursor);
  if (params?.role) q.set("role", params.role);
  if (params?.plan) q.set("plan", params.plan);
  if (params?.is_active !== undefined) q.set("is_active", String(params.is_active));
  if (params?.search) q.set("search", params.search);
  const qs = q.toString();
  return apiGet(`/api/v1/admin/users${qs ? `?${qs}` : ""}`);
}

export async function adminGetUser(userId: string): Promise<{ user: AdminUser }> {
  return apiGet(`/api/v1/admin/users/${userId}`);
}

export async function adminUpdateUser(userId: string, body: { is_active?: boolean }): Promise<unknown> {
  return apiPatch(`/api/v1/admin/users/${userId}`, body);
}

export async function adminGetUserBilling(userId: string): Promise<{
  subscription: Subscription | null;
  invoices: Invoice[];
}> {
  return apiGet(`/api/v1/admin/users/${userId}/billing`);
}

export async function adminPortalSession(userId: string, returnUrl?: string): Promise<{ url: string }> {
  return apiPost(`/api/v1/admin/users/${userId}/billing/portal-session`, returnUrl ? { return_url: returnUrl } : undefined);
}

export async function adminChangePlan(userId: string, body: {
  plan_id: string;
  billing_interval: "monthly";
  proration_behavior?: string;
}): Promise<unknown> {
  return apiPost(`/api/v1/admin/users/${userId}/billing/change-plan`, body);
}

export async function adminCancelSubscription(userId: string): Promise<unknown> {
  return apiPost(`/api/v1/admin/users/${userId}/cancel-subscription`);
}

export async function adminRetryInvoice(userId: string, invoiceId: string): Promise<unknown> {
  return apiPost(`/api/v1/admin/users/${userId}/billing/invoices/${invoiceId}/retry`);
}

export async function adminRefund(userId: string, body: {
  payment_intent_id?: string;
  charge_id?: string;
  amount_cents?: number;
  note?: string;
}): Promise<unknown> {
  return apiPost(`/api/v1/admin/users/${userId}/billing/refund`, body);
}

export async function adminGetUserCreditHistory(userId: string, params?: {
  limit?: number;
  cursor?: string;
  event_type?: string;
}): Promise<{ data: CreditLedgerEntry[]; next_cursor: string | null }> {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.cursor) q.set("cursor", params.cursor);
  if (params?.event_type) q.set("event_type", params.event_type);
  const qs = q.toString();
  return apiGet(`/api/v1/admin/users/${userId}/credits/history${qs ? `?${qs}` : ""}`);
}

export async function adminAdjustCredits(body: {
  user_id: string;
  amount: number;
  reason: string;
}): Promise<unknown> {
  return apiPost("/api/v1/admin/credits/adjust", body);
}

// ── Admin — Plans ─────────────────────────────────────────────────────────────

export async function adminGetPlans(includeInactive = false): Promise<{ data: Plan[] }> {
  return apiGet(`/api/v1/admin/plans${includeInactive ? "?include_inactive=true" : ""}`);
}

export async function adminCreatePlan(body: {
  code: string;
  name: string;
  monthly_credit_allotment: number;
  credits_rollover?: boolean;
  price_monthly?: number | null;
  currency?: string;
  is_active?: boolean;
}): Promise<unknown> {
  return apiPost("/api/v1/admin/plans", body);
}

// ── Admin — Credit Packs ──────────────────────────────────────────────────────

export async function adminGetCreditPacks(includeInactive = false): Promise<{ data: CreditPack[] }> {
  return apiGet(`/api/v1/admin/credit-packs${includeInactive ? "?include_inactive=true" : ""}`);
}

export async function adminCreateCreditPack(body: {
  code: string;
  name: string;
  credits: number;
  price: number;
  currency?: string;
  is_active?: boolean;
}): Promise<unknown> {
  return apiPost("/api/v1/admin/credit-packs", body);
}

// ── Admin — Workers & System ──────────────────────────────────────────────────

export async function adminGetWorkers(): Promise<{ workers: { active: WorkerInfo[]; stale: WorkerInfo[] } }> {
  return apiGet("/api/v1/admin/workers");
}

export async function adminGetDeadLetterJobs(params?: {
  limit?: number;
  cursor?: string;
}): Promise<{ data: unknown[]; next_cursor: string | null }> {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.cursor) q.set("cursor", params.cursor);
  const qs = q.toString();
  return apiGet(`/api/v1/admin/dead-letter-jobs${qs ? `?${qs}` : ""}`);
}

// ── Admin — Model Configs ─────────────────────────────────────────────────────

export async function adminGetModelConfigs(): Promise<{ data: ModelConfig[] }> {
  return apiGet("/api/v1/admin/model-config");
}

export async function adminCreateModelConfig(body: {
  task_type: string;
  provider: string;
  model_name: string;
  model_version?: string | null;
  fallback_model_name?: string | null;
  fallback_provider?: string | null;
  token_multiplier?: number | null;
  rollout_percentage?: number | null;
  is_active?: boolean | null;
}): Promise<unknown> {
  return apiPost("/api/v1/admin/model-config", body);
}

export async function adminUpdateModelConfig(configId: string, body: {
  rollout_percentage?: number;
  is_active?: boolean;
  fallback_model_name?: string;
  fallback_provider?: string;
}): Promise<unknown> {
  return apiPatch(`/api/v1/admin/model-config/${configId}`, body);
}
