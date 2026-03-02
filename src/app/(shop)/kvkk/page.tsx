import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "Vorte Tekstil KVKK aydınlatma metni. 6698 sayılı kanun kapsamında kişisel veri işleme politikamız.",
  alternates: { canonical: "/kvkk" },
};

export default function KVKKPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "KVKK Aydınlatma Metni" }]} />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">KVKK Aydınlatma Metni</h1>
      <div className="mt-6 space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, Vorte Tekstil olarak kişisel verilerinizi aşağıdaki amaçlarla işlemekteyiz:</p>
        <h2 className="text-lg font-bold text-gray-900">Veri Sorumlusu</h2>
        <p>Vorte Tekstil Ticaret Ltd. Şti. - Nilüfer, Bursa</p>
        <h2 className="text-lg font-bold text-gray-900">İşlenen Kişisel Veriler</h2>
        <p>Kimlik bilgileri, iletişim bilgileri, müşteri işlem bilgileri, finansal bilgiler.</p>
        <h2 className="text-lg font-bold text-gray-900">İşleme Amaçları</h2>
        <p>Sözleşme süreçlerinin yürütülmesi, sipariş ve teslimat işlemleri, müşteri ilişkileri yönetimi, yasal yükümlülüklerin yerine getirilmesi.</p>
        <h2 className="text-lg font-bold text-gray-900">Haklarınız</h2>
        <p>KVKK&apos;nın 11. maddesi kapsamında; kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltme, silinmesini isteme haklarına sahipsiniz.</p>
      </div>
    </div>
  );
}
