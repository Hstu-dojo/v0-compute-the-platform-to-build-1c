import { getIdToken } from "./firebase";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://tutor-ai.up.railway.app";

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pilotai_session_id");
}

async function buildHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getIdToken();
  const headers: Record<string, string> = {
    ...extra,
  };
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

export async function apiPostFormData<T = unknown>(path: string, formData: FormData): Promise<T> {
  const token = await getIdToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const sessionId = getSessionId();
  if (sessionId) headers["x-session-id"] = sessionId;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
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
