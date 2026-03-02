import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi",
  description: "Vorte Tekstil mesafeli satış sözleşmesi. Online alışveriş koşulları ve haklarınız.",
  alternates: { canonical: "/mesafeli-satis" },
};

export default function DistanceSellingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Mesafeli Satış Sözleşmesi" }]} />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">Mesafeli Satış Sözleşmesi</h1>
      <div className="mt-6 space-y-4 text-sm text-gray-600 leading-relaxed">
        <h2 className="text-lg font-bold text-gray-900">Madde 1 - Taraflar</h2>
        <p><strong>Satıcı:</strong> Vorte Tekstil Ticaret Ltd. Şti., Nilüfer/Bursa</p>
        <p><strong>Alıcı:</strong> Sipariş veren kişi</p>
        <h2 className="text-lg font-bold text-gray-900">Madde 2 - Konu</h2>
        <p>İşbu sözleşmenin konusu, alıcının vorte.com.tr üzerinden sipariş ettiği ürünlerin satışı ve teslimatına ilişkin hak ve yükümlülüklerin belirlenmesidir.</p>
        <h2 className="text-lg font-bold text-gray-900">Madde 3 - Teslimat</h2>
        <p>Ürünler, sipariş onayından itibaren en geç 30 gün içinde teslim edilir. Standart teslimat süresi 1-3 iş günüdür.</p>
        <h2 className="text-lg font-bold text-gray-900">Madde 4 - Cayma Hakkı</h2>
        <p>Alıcı, ürünü teslim aldığı tarihten itibaren 14 gün içinde cayma hakkını kullanabilir. İç giyim ürünlerinde hijyen koşullarına uyulması gerekmektedir.</p>
      </div>
    </div>
  );
}
