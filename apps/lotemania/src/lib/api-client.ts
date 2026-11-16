// Fetch wrapper that transparently retries once via /api/auth/refresh on
// a 401. This is what the original panel was missing — it bounced
// straight to the login screen on any expired access token instead of
// trying a refresh first.
let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch("/api/auth/refresh", { method: "POST" })
      .then((res) => res.ok)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401) return res;

  const refreshed = await refreshSession();
  if (!refreshed) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return res;
  }

  return fetch(input, init);
}
