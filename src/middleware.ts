import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { isApiPath, isProtectedPage } from "@/lib/api-request";

function continueWithPath(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-cas-path", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

const withClerk = clerkMiddleware(async (auth, request) => {
  if (isApiPath(request.nextUrl.pathname)) return;
  if (isProtectedPage(request.nextUrl.pathname)) await auth.protect();
  return continueWithPath(request);
});

function keysPresent(): boolean {
  const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const secret = process.env.CLERK_SECRET_KEY ?? "";
  return (publishable.startsWith("pk_test_") || publishable.startsWith("pk_live_")) && secret.startsWith("sk_");
}

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!keysPresent()) {
    if (isProtectedPage(request.nextUrl.pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("redirect_url", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return continueWithPath(request);
  }
  return withClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
