import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes - check for admin session
  if (pathname.startsWith("/admin")) {
    const sessionToken =
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value;

    if (!sessionToken) {
      return NextResponse.redirect(new URL("/giris?callbackUrl=/admin", request.url));
    }
  }

  // Customer account routes
  if (pathname.startsWith("/hesabim")) {
    const sessionToken =
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value;

    if (!sessionToken) {
      return NextResponse.redirect(
        new URL(`/giris?callbackUrl=${pathname}`, request.url)
      );
    }
  }

  // Dealer routes - check for dealer session
  if (pathname.startsWith("/bayi") && !pathname.startsWith("/bayi-girisi")) {
    const dealerToken = request.cookies.get("dealer-session")?.value;

    if (!dealerToken) {
      return NextResponse.redirect(new URL("/bayi-girisi", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/hesabim/:path*", "/bayi/:path*"],
};
