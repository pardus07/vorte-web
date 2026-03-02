import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { CookieConsent } from "@/components/ui/CookieConsent";
import { JsonLd } from "@/components/seo/JsonLd";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Vorte Tekstil | Kaliteli İç Giyim - Toptan ve Perakende",
    template: "%s | Vorte Tekstil",
  },
  description:
    "Vorte Tekstil - Erkek boxer ve kadın iç giyim ürünleri. Toptan ve perakende satış. Premium kalite, uygun fiyat. Bursa, Türkiye.",
  keywords: [
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
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Vorte Tekstil",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Vorte Tekstil" }],
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} font-sans antialiased`}>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": ["Organization", "ClothingStore"],
            name: "Vorte Tekstil",
            url: "https://www.vorte.com.tr",
            logo: "https://www.vorte.com.tr/logo.png",
            telephone: "+90-537-622-0694",
            email: "info@vorte.com.tr",
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
              telephone: "+90-537-622-0694",
              contactType: "customer service",
              availableLanguage: "Turkish",
            },
            sameAs: [],
          }}
        />
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <ScrollToTop />
            <CookieConsent />
          </div>
        </Providers>
      </body>
    </html>
  );
}
