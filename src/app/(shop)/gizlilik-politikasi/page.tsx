import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "Vorte Tekstil gizlilik politikası. Kişisel verilerin korunması ve gizlilik ilkelerimiz.",
  alternates: { canonical: "/gizlilik-politikasi" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Gizlilik Politikası" }]} />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">Gizlilik Politikası</h1>
      <div className="mt-6 space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>Son güncelleme: 01.03.2026</p>
        <p>Vorte Tekstil olarak kişisel verilerinizin güvenliği konusunda azami hassasiyet göstermekteyiz. Bu gizlilik politikası, web sitemizi kullanırken toplanan bilgilerin nasıl kullanıldığını açıklar.</p>
        <h2 className="text-lg font-bold text-gray-900">Toplanan Bilgiler</h2>
        <p>Ad, soyad, e-posta adresi, telefon numarası, teslimat adresi gibi bilgiler sipariş sürecinde toplanmaktadır.</p>
        <h2 className="text-lg font-bold text-gray-900">Bilgilerin Kullanımı</h2>
        <p>Kişisel bilgileriniz yalnızca sipariş işleme, teslimat, müşteri hizmetleri ve yasal yükümlülükler kapsamında kullanılmaktadır.</p>
        <h2 className="text-lg font-bold text-gray-900">Çerezler</h2>
        <p>Web sitemiz, kullanıcı deneyimini iyileştirmek amacıyla çerez teknolojisini kullanmaktadır.</p>
        <h2 className="text-lg font-bold text-gray-900">İletişim</h2>
        <p>Gizlilik politikamız hakkında sorularınız için info@vorte.com.tr adresinden bize ulaşabilirsiniz.</p>
      </div>
    </div>
  );
}
