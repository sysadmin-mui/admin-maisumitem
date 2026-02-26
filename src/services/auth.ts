export function setAdminSession(token: string, user: unknown) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("adminToken", token);
    sessionStorage.setItem("adminUser", JSON.stringify(user));
  }
}

export function clearAdminSession() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminUser");
  }
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("adminToken");
}

export function getAdminUser<T = unknown>(): T | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem("adminUser");
  return raw ? (JSON.parse(raw) as T) : null;
}
