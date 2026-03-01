import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Hakkımızda" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Hakkımızda" }]} />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">Hakkımızda</h1>
      <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
        <p>Vorte Tekstil, Bursa Nilüfer&apos;de faaliyet gösteren, kaliteli iç giyim ürünleri üreten ve satan bir firmadır.</p>
        <p>Premium kumaş kalitesi, modern tasarımlar ve uygun fiyat politikamız ile müşterilerimize en iyi deneyimi sunmayı hedefliyoruz.</p>
        <p>Bayilik ağımız ile Shell benzin istasyonları başta olmak üzere Bursa ve çevresinde birçok noktada ürünlerimize ulaşabilirsiniz.</p>
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
