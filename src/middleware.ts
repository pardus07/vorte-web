import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Redirect non-www to www (SEO: single canonical domain)
  if (hostname === "vorte.com.tr" || hostname.startsWith("vorte.com.tr:")) {
    const target = `https://www.vorte.com.tr${pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(target, 301);
  }

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
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
