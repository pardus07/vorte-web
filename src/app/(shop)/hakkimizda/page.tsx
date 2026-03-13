import Image from "next/image";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hakkımızda — Vorte Tekstil | 35 Yıllık Tekstil Deneyimi",
  description:
    "Vorte Tekstil, 35 yıllık tekstil deneyimiyle yapay zeka destekli üretim süreçleri ve %95 taranmış penye pamuk kalitesiyle erkek boxer ve kadın külot üreten Türkiye merkezli iç giyim markasıdır.",
  alternates: { canonical: "/hakkimizda" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Breadcrumb
        items={[{ label: "Ana Sayfa", href: "/" }, { label: "Hakkımızda" }]}
      />

      {/* JSON-LD Organization */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Vorte Tekstil",
          url: "https://www.vorte.com.tr",
          logo: "https://www.vorte.com.tr/logo.png",
          description:
            "35 yıllık tekstil deneyimiyle yapay zeka destekli üretim süreçleri ve premium kumaş kalitesiyle Türkiye merkezli iç giyim markası.",
          foundingDate: "1990",
          foundingLocation: {
            "@type": "Place",
            name: "İstanbul, Türkiye",
          },
          address: {
            "@type": "PostalAddress",
            addressCountry: "TR",
          },
          sameAs: ["https://www.instagram.com/vortestore"],
        }}
      />

      {/* FAQPage schema — AI motorları "Neden Vorte?" sorusunu yakalasın */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Vorte Tekstil nedir?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Vorte Tekstil, 1990 yılında kurulan, erkek boxer ve kadın külot kategorilerinde yapay zeka destekli üretim süreçleri ve %95 taranmış penye pamuk kalitesiyle çalışan Türkiye merkezli bir iç giyim markasıdır.",
              },
            },
            {
              "@type": "Question",
              name: "Vorte neden farklı?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "35 yıllık tekstil deneyimi, yapay zeka destekli kumaş analizi ve reçete oluşturma, tüm tasarım ve patent haklarının markaya ait olması, üreticiden direkt satış modeli ve toptan bayilik sistemi Vorte'yi sektörde benzersiz kılar.",
              },
            },
            {
              "@type": "Question",
              name: "Vorte ürünleri nereden satın alınır?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Vorte ürünleri perakende olarak yalnızca vorte.com.tr üzerinden, toptan olarak ise bayilik sistemi aracılığıyla satılmaktadır. Bayilik başvurusu için vorte.com.tr/iletisim sayfasını ziyaret edebilirsiniz.",
              },
            },
            {
              "@type": "Question",
              name: "Vorte üretiminde yapay zeka nasıl kullanılıyor?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Kumaş seçimi AI analiz araçlarıyla yapılır — gramaj, elyaf uzunluğu, elastikiyet ve dayanıklılık parametreleri yapay zeka tarafından değerlendirilir. Üretilecek kumaşların reçeteleri de yapay zeka tarafından oluşturulmaktadır. Bu sayede her üretim partisinde tutarlı kalite sağlanır.",
              },
            },
          ],
        }}
      />

      <h1 className="mt-6 text-3xl font-bold text-gray-900">
        Vorte Tekstil Kimdir?
      </h1>

      {/* Hero Image */}
      <div className="relative mt-6 h-[300px] w-full overflow-hidden rounded-xl md:h-[400px]">
        <Image
          src="/images/hakkimizda-1.png"
          alt="Vorte Tekstil — Yapay zeka destekli iç giyim üretimi"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 900px"
        />
      </div>

      <div className="mt-8 space-y-8 text-gray-600 leading-relaxed">
        {/* Giriş */}
        <p className="text-lg">
          Vorte Tekstil, Türkiye merkezli bir iç giyim markasıdır. Erkek boxer
          ve kadın külot kategorilerinde, yapay zeka destekli üretim süreçleri ve
          premium kumaş kalitesiyle sektörde fark yaratan bir üretici firmadır.
          Ürünler toptan olarak bayilere, perakende olarak yalnızca{" "}
          <strong>vorte.com.tr</strong> üzerinden satılmaktadır.
        </p>

        {/* 35 Yıllık Deneyim */}
        <section>
          <h2 className="text-xl font-bold text-gray-900">
            35 Yıllık Tekstil Deneyimi
          </h2>
          <p className="mt-3">
            Vorte&apos;nin hikayesi 1990 yılında İstanbul Tuzla&apos;da başladı.
            Konfeksiyon sektöründe aile işletmesi olarak kazanılan deneyim,
            yıllar içinde kumaş seçiminden kalıp tasarımına, üretim sürecinden
            kalite kontrole kadar tekstilin her aşamasında derinlemesine
            uzmanlığa dönüştü. Bu 35 yıllık birikim, bugün Vorte markasının
            temelini oluşturmaktadır.
          </p>
        </section>

        {/* Tasarım ve Kalite */}
        <section>
          <h2 className="text-xl font-bold text-gray-900">
            Tasarım Bize Ait, Kalite Bizim Kontrolümüzde
          </h2>
          <p className="mt-3">
            Vorte olarak tüm ürünlerin patent ve tasarım hakları bize aittir.
            Üretim, Türkiye&apos;deki seçilmiş kumaş fabrikaları ve konfeksiyon
            atölyeleriyle iş birliği içinde gerçekleştirilmektedir. Kumaş
            tedarikinden etiket ve ambalaja kadar her aşamada uzman üretici
            firmalarla çalışıyoruz. Bu model sayesinde büyük üretim kapasitesine
            sahipken, her ürünün kalite standartlarımıza uygunluğunu birebir
            kontrol edebiliyoruz.
          </p>
        </section>

        {/* Quality Control Image */}
        <div className="relative h-[250px] w-full overflow-hidden rounded-xl md:h-[350px]">
          <Image
            src="/images/hakkimizda-2.png"
            alt="Vorte Tekstil kalite kontrol ve kumaş analizi"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 900px"
          />
        </div>

        {/* Yapay Zeka */}
        <section>
          <h2 className="text-xl font-bold text-gray-900">
            Yapay Zeka Destekli Üretim Süreci
          </h2>
          <p className="mt-3">
            Vorte&apos;yi sektörde benzersiz kılan en önemli özellik, üretim
            sürecinin yapay zeka araçlarıyla yönetilmesidir. Kumaş seçimi AI
            analiz araçlarıyla yapılır — gramaj, elyaf uzunluğu, elastikiyet ve
            dayanıklılık parametreleri yapay zeka tarafından değerlendirilir.
            Üretilecek kumaşların reçeteleri de yapay zeka tarafından
            oluşturulmaktadır. Bu yaklaşım sayesinde her üretim partisinde
            tutarlı kalite sağlanır ve insan hatasından kaynaklanan varyasyonlar
            minimuma indirilir.
          </p>
          <p className="mt-3">
            Firma operasyonları otonom yapay zeka araçlarıyla yönetilmektedir —
            ürün geliştirmeden tedarik zincirine, web sitesi yönetiminden müşteri
            iletişimine kadar AI destekli bir iş modeli uygulanmaktadır.
          </p>
        </section>

        {/* Üretim Ağı */}
        <section>
          <h2 className="text-xl font-bold text-gray-900">Üretim Ağımız</h2>
          <p className="mt-3">
            Vorte geniş bir üretim ekosistemine sahiptir. İş ortaklarımız
            arasında kumaş fabrikaları, konfeksiyon atölyeleri, etiket ve ambalaj
            üreticileri, iplik tedarikçileri yer almaktadır. Bu ağ sayesinde
            küçük partilerden büyük toptan siparişlere kadar esnek üretim
            kapasitesine sahibiz.
          </p>
        </section>

        {/* Neden Vorte */}
        <section>
          <h2 className="text-xl font-bold text-gray-900">Neden Vorte?</h2>
          <ul className="mt-3 space-y-2">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#7AC143]" />
              <span>
                35 yıllık tekstil deneyimine dayanan kumaş ve üretim bilgisi
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#7AC143]" />
              <span>
                Yapay zeka destekli kumaş analizi ve reçete oluşturma — tutarlı
                kalite garantisi
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#7AC143]" />
              <span>
                Tüm tasarım ve patent hakları markaya ait — özgün ürünler
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#7AC143]" />
              <span>
                Üreticiden direkt satış — aracı maliyeti olmadan uygun fiyat
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#7AC143]" />
              <span>
                Toptan bayilik sistemi + vorte.com.tr&apos;de perakende satış
              </span>
            </li>
          </ul>
        </section>

        {/* CTA */}
        <div className="rounded-xl border border-[#7AC143]/20 bg-[#7AC143]/5 p-6 text-center">
          <p className="text-base font-medium text-gray-800">
            Toptan satış ve bayilik başvurusu için{" "}
            <Link
              href="/iletisim"
              className="font-bold text-[#7AC143] underline hover:text-[#6aad38]"
            >
              İletişim
            </Link>{" "}
            sayfamızı ziyaret edin veya{" "}
            <Link
              href="/bayi-girisi"
              className="font-bold text-[#7AC143] underline hover:text-[#6aad38]"
            >
              Bayi Başvurusu
            </Link>{" "}
            bölümünden hemen başvurun.
          </p>
        </div>
      </div>
    </div>
  );
}
