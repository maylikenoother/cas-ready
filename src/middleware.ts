import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  /^\/home(?:\/|$)/,
  /^\/profile(?:\/|$)/,
  /^\/prep(?:\/|$)/,
  /^\/interview(?:\/|$)/,
  /^\/history(?:\/|$)/,
  /^\/billing(?:\/|$)/,
  /^\/settings(?:\/|$)/,
  /^\/admin(?:\/|$)/,
  /^\/org(?:\/|$)/,
];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const protectedPath = PROTECTED.some((pattern) => pattern.test(request.nextUrl.pathname));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const configured = Boolean(url && key && !url.includes("example.supabase.co"));

  if (!configured) {
    if (protectedPath) return redirectToLogin(request);
    return response;
  }

  const supabase = createServerClient(url as string, key as string, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }

  if (protectedPath && !userId) return redirectToLogin(request);
  return response;
}

function redirectToLogin(request: NextRequest) {
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
