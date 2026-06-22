import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Social media bot'ları: Range header gönderir, Next.js dynamic route'larda
// bunu handle edemez → 500 veya bozuk response (next.js#44470)
const BOT_UA_PATTERN = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|Discordbot/i;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  const userAgent = request.headers.get("user-agent") || "";

  // Social media crawler'ları: Range header'ını strip et
  if (BOT_UA_PATTERN.test(userAgent) && request.headers.has("range")) {
    const headers = new Headers(request.headers);
    headers.delete("range");
    return NextResponse.next({ request: { headers } });
  }

  // Redirect non-www to www (SEO: tek canonical domain) — coming-soon'dan ÖNCE
  if (hostname === "vorte.com.tr" || hostname.startsWith("vorte.com.tr:")) {
    const target = `https://www.vorte.com.tr${pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(target, 301);
  }

  // API rotaları: coming-soon'a YÖNLENDİRİLMEZ — santral/mobil server-to-server
  // çağrıları (vorte-voice-ai, android) ve admin/webhook akışları çalışmaya devam eder.
  if (pathname.startsWith("/api/")) {
    // CSRF koruması: mutating API isteklerinde Origin/Referer doğrula
    if (
      !pathname.startsWith("/api/auth/") && // NextAuth kendi CSRF'ini yönetir
      !pathname.startsWith("/api/admin/") && // Admin route'ları session-authenticated
      !pathname.startsWith("/api/webhooks/") && // Webhook'lar dış servislerden gelir
      !pathname.startsWith("/api/payment/callback") && // iyzico callback (form POST)
      !pathname.startsWith("/api/dealer/payment/callback") && // iyzico dealer callback
      !pathname.startsWith("/api/dealer-application") && // Mobil middleware proxy (server-to-server)
      ["POST", "PUT", "DELETE", "PATCH"].includes(request.method)
    ) {
      // Server-to-server çağrılar (X-Server-Api-Key) CSRF'i bypass eder
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

    return NextResponse.next();
  }

  // YAPIM AŞAMASINDA: tüm sayfa istekleri coming-soon ana sayfasına rewrite edilir.
  // rewrite (redirect değil) → URL korunur, zincir yok; ziyaretçi tek bir sayfa görür.
  // Eski Vorte Tekstil sayfaları repoda durur ama ulaşılamaz (işlevsiz).
  if (pathname !== "/") {
    return NextResponse.rewrite(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Şu yollar HARİÇ tüm istekleri yakala:
     * - _next/static (statik dosyalar)
     * - _next/image (görsel optimizasyonu)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public görseller (.png/.jpg/.svg)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
