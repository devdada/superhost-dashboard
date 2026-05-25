const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type AuthUser = {
  email: string;
  role: "admin" | string;
};

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    credentials: "include",
  });
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await apiFetch("/auth/me", { cache: "no-store" });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error("Failed to verify session");
  }
  return response.json();
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body && typeof body === "object" ? body.detail : null;
    throw new Error(typeof detail === "string" ? detail : "Login failed");
  }
  return response.json();
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}
