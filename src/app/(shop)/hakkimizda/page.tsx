import Image from "next/image";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Hakkımızda" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Hakkımızda" }]} />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">Hakkımızda</h1>

      {/* Hero Image */}
      <div className="mt-6 relative h-[300px] w-full overflow-hidden rounded-lg md:h-[400px]">
        <Image
          src="/images/hakkimizda-1.png"
          alt="Vorte Tekstil Üretim Tesisi"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 900px"
        />
      </div>

      <div className="mt-8 space-y-4 text-gray-600 leading-relaxed">
        <p>Vorte Tekstil, Bursa Nilüfer&apos;de faaliyet gösteren, kaliteli iç giyim ürünleri üreten ve satan bir firmadır.</p>
        <p>Premium kumaş kalitesi, modern tasarımlar ve uygun fiyat politikamız ile müşterilerimize en iyi deneyimi sunmayı hedefliyoruz.</p>
        <p>Bayilik ağımız ile Shell benzin istasyonları başta olmak üzere Bursa ve çevresinde birçok noktada ürünlerimize ulaşabilirsiniz.</p>

        {/* Quality Control Image */}
        <div className="relative h-[250px] w-full overflow-hidden rounded-lg md:h-[350px]">
          <Image
            src="/images/hakkimizda-2.png"
            alt="Vorte Tekstil Kalite Kontrol"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 900px"
          />
        </div>

        <h2 className="text-xl font-bold text-gray-900 pt-4">Değerlerimiz</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Kaliteli kumaş ve işçilik</li>
          <li>Uygun fiyat politikası</li>
          <li>Hızlı ve güvenilir teslimat</li>
          <li>Müşteri memnuniyeti odaklı hizmet</li>
        </ul>
      </div>
    </div>
  );
}
