import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "İade Politikası" };

export default function ReturnPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "İade Politikası" }]} />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">İade ve Değişim Politikası</h1>
      <div className="mt-6 space-y-4 text-sm text-gray-600 leading-relaxed">
        <h2 className="text-lg font-bold text-gray-900">İade Koşulları</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Ürünü teslim aldığınız tarihten itibaren 14 gün içinde iade talebinde bulunabilirsiniz.</li>
          <li>İade edilecek ürünlerin kullanılmamış, yıkanmamış ve orijinal etiketleri sökülmemiş olması gerekmektedir.</li>
          <li>Hijyen koşulları gereği, ambalajı açılmış iç giyim ürünleri iade edilemez.</li>
          <li>İade kargo ücreti alıcıya aittir.</li>
        </ul>
        <h2 className="text-lg font-bold text-gray-900">Değişim</h2>
        <p>Beden değişikliği için aynı koşullar geçerlidir. Değişim talebinizi müşteri hizmetlerimize iletebilirsiniz.</p>
        <h2 className="text-lg font-bold text-gray-900">İade Süreci</h2>
        <p>İade talebiniz onaylandıktan sonra ödemeniz 5-10 iş günü içinde kredi kartınıza iade edilir.</p>
      </div>
    </div>
  );
}
