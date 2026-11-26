import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const isProtected = createRouteMatcher([
  "/home(.*)",
  "/profile(.*)",
  "/prep(.*)",
  "/interview(.*)",
  "/history(.*)",
  "/billing(.*)",
  "/settings(.*)",
  "/admin(.*)",
  "/org(.*)",
]);

const withClerk = clerkMiddleware(async (auth, request) => {
  if (isProtected(request)) await auth.protect();
});

function keysPresent(): boolean {
  const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const secret = process.env.CLERK_SECRET_KEY ?? "";
  return (publishable.startsWith("pk_test_") || publishable.startsWith("pk_live_")) && secret.startsWith("sk_");
}

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!keysPresent()) {
    if (isProtected(request)) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("redirect_url", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  return withClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
