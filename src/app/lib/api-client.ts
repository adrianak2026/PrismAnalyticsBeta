"use client";

const TOKEN_KEY = "prism_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

export interface ApiError { error: string; status: number; }

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers, cache: "no-store" });
  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => ({}));
      if (body?.error) message = body.error;
    }
    const err = new Error(message) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  if (contentType.includes("application/json")) return res.json() as Promise<T>;
  return res.text() as unknown as Promise<T>;
}
