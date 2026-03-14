import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Social media bot'ları: Range header gönderir, Next.js dynamic route'larda
// bunu handle edemez → 500 veya bozuk response (next.js#44470)
const BOT_UA_PATTERN = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|Discordbot/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  const userAgent = request.headers.get("user-agent") || "";

  // Social media crawler'ları: Range header'ını strip et
  if (BOT_UA_PATTERN.test(userAgent) && request.headers.has("range")) {
    const headers = new Headers(request.headers);
    headers.delete("range");
    return NextResponse.next({ request: { headers } });
  }

  // Redirect non-www to www (SEO: single canonical domain)
  if (hostname === "vorte.com.tr" || hostname.startsWith("vorte.com.tr:")) {
    const target = `https://www.vorte.com.tr${pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(target, 301);
  }


  // CSRF protection: Validate Origin/Referer for mutating API requests
  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/") && // NextAuth handles its own CSRF
    !pathname.startsWith("/api/admin/") && // Admin routes are session-authenticated
    !pathname.startsWith("/api/webhooks/") && // Webhooks come from external services
    !pathname.startsWith("/api/payment/callback") && // iyzico callback is a form POST from their server
    !pathname.startsWith("/api/dealer/payment/callback") && // iyzico dealer callback
    !pathname.startsWith("/api/dealer-application") && // Mobile middleware proxy (server-to-server)
    ["POST", "PUT", "DELETE", "PATCH"].includes(request.method)
  ) {
    // Server-to-server calls from middleware proxy bypass CSRF (authenticated via X-Server-Api-Key)
    const serverApiKey = request.headers.get("x-server-api-key");
    if (!serverApiKey) {
      const origin = request.headers.get("origin");
      const referer = request.headers.get("referer");
      const allowedOrigins = [
        "https://www.vorte.com.tr",
        "https://vorte.com.tr",
        process.env.NEXT_PUBLIC_SITE_URL,
        process.env.NODE_ENV === "development" ? "http://localhost:3000" : null,
      ].filter(Boolean) as string[];

      // At least one of Origin or Referer must be present and match
      const originMatch = origin && allowedOrigins.some((o) => origin === o);
      const refererMatch = referer && allowedOrigins.some((o) => referer.startsWith(o!));

      if (!originMatch && !refererMatch) {
        return NextResponse.json(
          { error: "CSRF doğrulaması başarısız" },
          { status: 403 }
        );
      }
    }
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
