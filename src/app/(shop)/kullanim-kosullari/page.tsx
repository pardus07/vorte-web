import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanım Koşulları",
  description: "Vorte Tekstil web sitesi kullanım koşulları ve şartları.",
  alternates: { canonical: "/kullanim-kosullari" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Kullanım Koşulları" }]} />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">Kullanım Koşulları</h1>
      <div className="mt-6 space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>vorte.com.tr web sitesini kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız.</p>
        <h2 className="text-lg font-bold text-gray-900">Genel Hükümler</h2>
        <p>Bu web sitesi Vorte Tekstil Ticaret Ltd. Şti. tarafından işletilmektedir. Site içeriği bilgilendirme amaçlıdır.</p>
        <h2 className="text-lg font-bold text-gray-900">Fikri Mülkiyet</h2>
        <p>Sitedeki tüm içerik, görseller, logolar ve tasarımlar Vorte Tekstil&apos;e aittir ve izinsiz kullanılamaz.</p>
        <h2 className="text-lg font-bold text-gray-900">Sorumluluk Sınırı</h2>
        <p>Ürün görselleri ve açıklamaları bilgilendirme amaçlıdır. Renk ve boyut farklılıkları ekran ayarlarına bağlı olarak değişiklik gösterebilir.</p>
      </div>
    </div>
  );
}
