import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ContactForm } from "@/components/forms/ContactForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İletişim — Vorte Tekstil | Nilüfer, Bursa",
  description:
    "Vorte Tekstil iletişim bilgileri. Adres: Dumlupınar Mah., Nilüfer/Bursa. Tel: 0537 622 06 94. E-posta: info@vorte.com.tr. Toptan satış ve bayilik başvuruları.",
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
                itemListElement: [
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Product",
                      name: "Vorte Premium Penye Erkek Boxer",
                    },
                  },
                ],
              },
              {
                "@type": "OfferCatalog",
                name: "Kadın Külot",
                itemListElement: [
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Product",
                      name: "Vorte Premium Penye Kadın Külot",
                    },
                  },
                ],
              },
            ],
          },
        }}
      />
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "İletişim" }]} />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">İletişim</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Bize Ulaşın</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-[#7AC143]" />
              <div><p className="font-medium">Adres</p><p className="text-sm text-gray-600">Dumlupınar Mah., Kayabaşı Sok., 17BG, Nilüfer/Bursa</p></div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-5 w-5 text-[#7AC143]" />
              <div><p className="font-medium">Telefon</p><p className="text-sm text-gray-600"><a href="tel:+905376220694" className="hover:text-[#7AC143]">0537 622 06 94</a></p></div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-[#7AC143]" />
              <div><p className="font-medium">E-posta</p><p className="text-sm text-gray-600">info@vorte.com.tr</p></div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-[#7AC143]" />
              <div><p className="font-medium">Çalışma Saatleri</p><p className="text-sm text-gray-600">Pazartesi - Cumartesi: 09:00 - 18:00</p></div>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Mesaj Gönderin</h2>
          <div className="mt-4">
            <ContactForm />
          </div>
        </div>
      </div>

      {/* Google Maps */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900">Konum</h2>
        <div className="mt-4 h-[300px] w-full overflow-hidden rounded-lg md:h-[400px]">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1523!2d28.8313634!3d40.2295192!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14ca0fdfe4833a67%3A0xcf4970ae2fd2138e!2sVorte%20Tekstil%20%C4%B0%C3%A7%20Giyim%20%26%20%C3%87orap%20Toptan!5e0!3m2!1str!2str!4v1"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Vorte Tekstil Konum - Nilüfer, Bursa"
          />
        </div>
      </div>
    </div>
  );
}
