import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { CookieConsent } from "@/components/ui/CookieConsent";
import { JsonLd } from "@/components/seo/JsonLd";
import { AnalyticsScripts } from "@/components/seo/AnalyticsScripts";
import ChatWidget from "@/components/chat/ChatWidget";
import { getSiteSettings } from "@/lib/settings";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  const title = settings.metaTitle || "Vorte Tekstil | Kaliteli İç Giyim - Toptan ve Perakende";
  const description =
    settings.metaDescription ||
    "Vorte Tekstil - Erkek boxer ve kadın iç giyim ürünleri. Toptan ve perakende satış. Premium kalite, uygun fiyat. Bursa, Türkiye.";
  const keywords = settings.metaKeywords
    ? settings.metaKeywords.split(",").map((k) => k.trim())
    : [
        "iç giyim",
        "erkek boxer",
        "kadın külot",
        "toptan iç giyim",
        "toptan erkek boxer",
        "toptan kadın külot",
        "erkek boxer üretici",
        "bursa iç giyim toptancısı",
        "toptan boxer imalatçısı",
        "vorte tekstil",
        "bursa tekstil",
      ];

  const siteUrl = settings.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // OG image: /og-image.jpg → /api/og-image (rewrite ile)
  // Clean URL + Content-Disposition yok + Range header middleware'de strip ediliyor
  const ogImageUrl = settings.ogImageUrl
    ? `${siteUrl}/og-image.jpg`
    : `${siteUrl}/logo.png`;

  return {
    title: {
      default: title,
      template: `%s | ${settings.siteName || "Vorte Tekstil"}`,
    },
    description,
    keywords,
    metadataBase: new URL(siteUrl),
    icons: {
      icon: [
        { url: settings.faviconUrl || "/favicon.ico", sizes: "any" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
    },
    openGraph: {
      type: "website",
      url: siteUrl,
      locale: "tr_TR",
      siteName: settings.siteName || "Vorte Tekstil",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: settings.siteName || "Vorte Tekstil",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImageUrl],
    },
    alternates: {
      canonical: "/",
    },
    verification: settings.googleVerificationCode
      ? { google: settings.googleVerificationCode }
      : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <html lang="tr">
      <head>
        <AnalyticsScripts />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": ["Organization", "ClothingStore"],
            name: settings.siteName || "Vorte Tekstil",
            url: settings.siteUrl || "https://www.vorte.com.tr",
            logo: `${settings.siteUrl || "https://www.vorte.com.tr"}${settings.logoUrl || "/logo.png"}`,
            telephone: settings.contactPhone || "+90-537-622-0694",
            email: settings.contactEmail || "info@vorte.com.tr",
            address: {
              "@type": "PostalAddress",
              streetAddress: "Dumlupınar Mah., Kayabaşı Sok., 17BG",
              addressLocality: "Nilüfer",
              addressRegion: "Bursa",
              postalCode: "16110",
              addressCountry: "TR",
            },
            contactPoint: {
              "@type": "ContactPoint",
              telephone: settings.contactPhone || "+90-537-622-0694",
              contactType: "customer service",
              availableLanguage: "Turkish",
            },
            sameAs: [
              settings.instagramUrl,
              settings.facebookUrl,
              settings.twitterUrl,
              settings.youtubeUrl,
              settings.tiktokUrl,
            ].filter(Boolean),
          }}
        />
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <ScrollToTop />
            <CookieConsent />
            <ChatWidget />
          </div>
        </Providers>
      </body>
    </html>
  );
}
