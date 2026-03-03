import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Truck, Clock, MapPin, Package, CreditCard, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kargo ve Teslimat",
  description:
    "Vorte Tekstil kargo ve teslimat bilgileri. Türkiye geneli 1-3 iş günü teslimat. 200 TL üzeri ücretsiz kargo.",
  alternates: { canonical: "/kargo-teslimat" },
};

const highlights = [
  {
    icon: Truck,
    title: "Hızlı Teslimat",
    desc: "Siparişleriniz 1-3 iş günü içinde kapınızda.",
  },
  {
    icon: CreditCard,
    title: "Ücretsiz Kargo",
    desc: "200 TL ve üzeri siparişlerde kargo ücretsiz.",
  },
  {
    icon: MapPin,
    title: "Türkiye Geneli",
    desc: "Tüm illere hızlı ve güvenli teslimat.",
  },
  {
    icon: ShieldCheck,
    title: "Güvenli Paketleme",
    desc: "Ürünleriniz özenle paketlenerek gönderilir.",
  },
];

export default function ShippingDeliveryPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: "Kargo ve Teslimat" },
        ]}
      />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">
        Kargo ve Teslimat Bilgileri
      </h1>

      {/* Highlights */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {highlights.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-4 rounded-lg border border-gray-200 p-5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7AC143]/10">
              <Icon className="h-5 w-5 text-[#7AC143]" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{title}</h3>
              <p className="mt-0.5 text-sm text-gray-600">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="mt-10 space-y-8 text-sm leading-relaxed text-gray-600">
        {/* Kargo Firması */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Truck className="h-5 w-5 text-[#7AC143]" />
            Kargo Firması
          </h2>
          <p className="mt-3">
            Vorte Tekstil olarak <strong>Geliver</strong> altyapısını
            kullanmaktayız. Geliver, birden fazla kargo firmasıyla entegre
            çalışarak siparişinizi en hızlı ve en uygun maliyetle taşıyan kargo
            firması üzerinden gönderir. Bu sayede teslimat süreniz kısalır ve
            kargo süreciniz optimize edilir.
          </p>
          <p className="mt-2">
            Kargo firmalarımız arasında Yurtiçi Kargo, Aras Kargo, MNG Kargo,
            Sürat Kargo ve daha birçok anlaşmalı firma yer almaktadır.
          </p>
        </section>

        {/* Teslimat Süresi */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Clock className="h-5 w-5 text-[#7AC143]" />
            Teslimat Süresi
          </h2>
          <p className="mt-3">
            Siparişleriniz, ödemenin onaylanmasının ardından{" "}
            <strong>1-3 iş günü</strong> içinde teslim edilir. Teslimat süresi
            bulunduğunuz bölgeye ve kargo yoğunluğuna göre değişiklik
            gösterebilir.
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-900">
                    Bölge
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-900">
                    Tahmini Süre
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2.5">Bursa ve Marmara Bölgesi</td>
                  <td className="px-4 py-2.5">1 iş günü</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">
                    Ege, Akdeniz, İç Anadolu Bölgesi
                  </td>
                  <td className="px-4 py-2.5">1-2 iş günü</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">
                    Karadeniz, Doğu ve Güneydoğu Anadolu
                  </td>
                  <td className="px-4 py-2.5">2-3 iş günü</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Kargo Ücreti */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <CreditCard className="h-5 w-5 text-[#7AC143]" />
            Kargo Ücreti
          </h2>
          <div className="mt-3 rounded-lg bg-[#7AC143]/5 p-4">
            <p className="font-medium text-[#1A1A1A]">
              200 TL ve üzeri siparişlerde kargo tamamen ücretsizdir!
            </p>
          </div>
          <p className="mt-3">
            200 TL altındaki siparişlerde standart kargo ücreti{" "}
            <strong>29,90 TL</strong>&apos;dir. Kargo ücreti, sipariş özeti
            ekranında toplam tutarınıza eklenerek gösterilir.
          </p>
        </section>

        {/* Sipariş Hazırlama */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Package className="h-5 w-5 text-[#7AC143]" />
            Sipariş Hazırlama Süreci
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              <strong>Sipariş Onayı:</strong> Ödemeniz onaylandığında
              siparişiniz hazırlanmaya başlar.
            </li>
            <li>
              <strong>Paketleme:</strong> Ürünleriniz hijyenik koşullarda özenle
              paketlenir.
            </li>
            <li>
              <strong>Kargoya Teslim:</strong> Paketiniz en uygun kargo
              firmasına teslim edilir ve kargo takip numarası oluşturulur.
            </li>
            <li>
              <strong>Teslimat:</strong> Kargo firması paketinizi adresinize
              teslim eder.
            </li>
          </ol>
          <p className="mt-3">
            Hafta sonu ve resmi tatillerde sipariş hazırlama işlemleri bir
            sonraki iş gününe aktarılır.
          </p>
        </section>

        {/* Kargo Takibi */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <MapPin className="h-5 w-5 text-[#7AC143]" />
            Kargo Takibi
          </h2>
          <p className="mt-3">
            Siparişiniz kargoya verildikten sonra kargo takip numaranız
            e-posta ve SMS ile tarafınıza iletilir. Ayrıca{" "}
            <strong>Hesabım &gt; Siparişlerim</strong> sayfasından
            siparişlerinizin güncel durumunu ve kargo takip bilgisini
            görüntüleyebilirsiniz.
          </p>
        </section>

        {/* Teslimat Bölgesi */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <MapPin className="h-5 w-5 text-[#7AC143]" />
            Teslimat Bölgesi
          </h2>
          <p className="mt-3">
            Vorte Tekstil olarak <strong>Türkiye genelinde</strong> 81 ile
            teslimat yapmaktayız. Şu an için yurt dışı gönderim hizmetimiz
            bulunmamaktadır.
          </p>
        </section>

        {/* Önemli Bilgiler */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            Dikkat Edilmesi Gerekenler
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              Teslimat sırasında lütfen paketinizi kontrol ederek teslim
              alınız. Hasarlı veya eksik ürün durumunda kargo görevlisi
              huzurunda tutanak tutturmanızı öneririz.
            </li>
            <li>
              Adres bilgilerinizin eksiksiz ve doğru olduğundan emin olunuz.
              Hatalı adres nedeniyle yaşanacak teslimat gecikmelerinden Vorte
              Tekstil sorumlu tutulamaz.
            </li>
            <li>
              Kargo firmasının ulaşamadığı durumlarda, teslimat için ikinci bir
              deneme yapılır. İkinci denemede de teslim edilemeyen paketler
              depoya iade edilir.
            </li>
          </ul>
        </section>
      </div>

      {/* CTA */}
      <div className="mt-10 rounded-lg bg-[#333333] p-6 text-center text-white">
        <p className="text-lg font-bold">Sorularınız mı var?</p>
        <p className="mt-1 text-sm text-gray-300">
          Kargo ve teslimat ile ilgili tüm sorularınız için bize ulaşabilirsiniz.
        </p>
        <a
          href="/iletisim"
          className="mt-4 inline-block rounded-lg bg-[#7AC143] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6aad38]"
        >
          İletişime Geçin
        </a>
      </div>
    </div>
  );
}
