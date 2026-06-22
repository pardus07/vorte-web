import type { Metadata, Viewport } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import { Providers } from "@/components/Providers";
import { JsonLd } from "@/components/seo/JsonLd";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-baron",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr";

export const viewport: Viewport = {
  themeColor: "#05060a",
};

export const metadata: Metadata = {
  title: {
    default: "Vorte Dijital Teknoloji A.Ş.",
    template: "%s | Vorte Dijital Teknoloji A.Ş.",
  },
  description:
    "Vorte Dijital Teknoloji A.Ş. — İzmir merkezli, dijital teknoloji çözümleri geliştiren yazılım şirketi. Yeni kurumsal sitemiz çok yakında.",
  metadataBase: new URL(SITE_URL),
  applicationName: "Vorte Dijital Teknoloji A.Ş.",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    locale: "tr_TR",
    siteName: "Vorte Dijital Teknoloji A.Ş.",
    title: "Vorte Dijital Teknoloji A.Ş.",
    description:
      "İzmir merkezli dijital teknoloji şirketi. Yeni kurumsal sitemiz çok yakında.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} ${bebasNeue.variable} font-sans antialiased`}>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Vorte Dijital Teknoloji A.Ş.",
            legalName: "Vorte Dijital Teknoloji Anonim Şirketi",
            alternateName: "Vorte",
            url: SITE_URL,
            email: "info@vorte.com.tr",
            foundingLocation: {
              "@type": "Place",
              name: "İzmir, Türkiye",
            },
            address: {
              "@type": "PostalAddress",
              addressLocality: "Konak",
              addressRegion: "İzmir",
              addressCountry: "TR",
            },
            areaServed: {
              "@type": "Country",
              name: "Türkiye",
            },
            knowsAbout: [
              "yazılım geliştirme",
              "dijital teknoloji",
              "yapay zeka",
              "SaaS",
            ],
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
