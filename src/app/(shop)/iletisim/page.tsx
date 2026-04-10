import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ContactForm } from "@/components/forms/ContactForm";
import { JsonLd } from "@/components/seo/JsonLd";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İletişim — Vorte Tekstil | Nilüfer, Bursa",
  description:
    "Vorte Tekstil iletişim bilgileri. Adres: Dumlupınar Mah., Nilüfer/Bursa. Tel: 0850 305 86 35. E-posta: info@vorte.com.tr. Toptan satış ve bayilik başvuruları.",
  alternates: { canonical: "/iletisim" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* LocalBusiness — Google Business Profile uyumlu */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": ["ClothingStore", "LocalBusiness"],
          "@id": "https://www.vorte.com.tr/#business",
          name: "Vorte Tekstil",
          alternateName: "Vorte İç Giyim & Çorap Toptan",
          url: "https://www.vorte.com.tr",
          logo: "https://www.vorte.com.tr/logo.png",
          image: [
            "https://www.vorte.com.tr/og-image.jpg",
            "https://www.vorte.com.tr/logo.png",
          ],
          description:
            "35 yıllık tekstil deneyimiyle erkek boxer ve kadın külot üreten, yapay zeka destekli üretim süreçleriyle çalışan Türkiye merkezli iç giyim markası. Toptan ve perakende satış.",
          telephone: "+90-850-305-8635",
          email: "info@vorte.com.tr",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Dumlupınar Mah., Kayabaşı Sok., 17BG",
            addressLocality: "Nilüfer",
            addressRegion: "Bursa",
            postalCode: "16110",
            addressCountry: "TR",
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: 40.2295192,
            longitude: 28.8313634,
          },
          hasMap:
            "https://www.google.com/maps?cid=14934680307233444750",
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ],
              opens: "09:00",
              closes: "18:00",
            },
          ],
          priceRange: "₺₺",
          currenciesAccepted: "TRY",
          paymentAccepted: "Kredi Kartı, Banka Havalesi",
          areaServed: {
            "@type": "Country",
            name: "Türkiye",
          },
          brand: {
            "@type": "Brand",
            name: "Vorte",
          },
          foundingDate: "1990",
          knowsAbout: [
            "taranmış penye pamuk iç giyim",
            "erkek boxer toptan",
            "kadın külot toptan",
            "yapay zeka destekli tekstil üretimi",
          ],
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Vorte İç Giyim Koleksiyonu",
            itemListElement: [
              {
                "@type": "OfferCatalog",
                name: "Erkek Boxer",
                url: "https://www.vorte.com.tr/erkek-ic-giyim",
              },
              {
                "@type": "OfferCatalog",
                name: "Kadın Külot",
                url: "https://www.vorte.com.tr/kadin-ic-giyim",
              },
            ],
          },
        }}
      />
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "İletişim" }]} />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">İletişim</h1>

      <div className="mt-8 mx-auto max-w-2xl">
        <h2 className="text-lg font-bold text-gray-900">Mesaj Gönderin</h2>
        <div className="mt-4">
          <ContactForm />
        </div>
      </div>


    </div>
  );
}
