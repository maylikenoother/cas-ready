const PROTECTED_PAGES = ["/home", "/profile", "/prep", "/interview", "/history", "/billing", "/settings", "/admin", "/org"];

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}

export function isSameOriginApi(input: RequestInfo | URL): boolean {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (raw.startsWith("//")) return false;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return false;
    }
    if (typeof window === "undefined" || url.origin !== window.location.origin) return false;
    return isApiPath(url.pathname);
  }
  const path = raw.split("?")[0] ?? raw;
  return isApiPath(path);
}

export function apiRequestInit(input: RequestInfo | URL, init: RequestInit | undefined, token: string | null): RequestInit {
  const headers = new Headers(init?.headers);
  if (token && isSameOriginApi(input) && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return { ...init, headers };
}

export async function readApiError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string" && body.error.trim()) {
    return body.error;
  }
  return fallback;
}
