"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

const faqData: FAQSection[] = [
  {
    title: "Sipariş ve Ödeme",
    items: [
      {
        question: "Hangi ödeme yöntemlerini kabul ediyorsunuz?",
        answer:
          "Kredi kartı ve banka kartı ile ödeme kabul ediyoruz. Ödemelerimiz iyzico altyapısı üzerinden 3D Secure güvenlik protokolü ile gerçekleştirilmektedir. Visa, MasterCard ve Troy kartlarınız ile güvenle alışveriş yapabilirsiniz.",
      },
      {
        question: "Taksitli ödeme yapabilir miyim?",
        answer:
          "Evet, kredi kartınız ile 2, 3, 6 ve 9 taksit seçeneklerinden yararlanabilirsiniz. Taksit seçenekleri ve oranları ödeme sayfasında kartınıza göre otomatik olarak gösterilir. Taksit imkanları banka ve kart tipine göre değişiklik gösterebilir.",
      },
      {
        question: "Ödemem güvenli mi?",
        answer:
          "Kesinlikle. Tüm ödemeler iyzico güvenli ödeme altyapısı üzerinden, 3D Secure doğrulama ile gerçekleştirilir. Kart bilgileriniz sitemizde saklanmaz ve SSL sertifikası ile şifrelenerek iletilir.",
      },
      {
        question: "Sipariş verdikten sonra siparişimi değiştirebilir miyim?",
        answer:
          "Siparişleriniz kargoya verilmeden önce değişiklik yapılabilir. Bunun için Hesabım > Siparişlerim sayfasından veya iletişim kanallarımızdan bize ulaşabilirsiniz. Kargoya verilen siparişlerde değişiklik yapılamaz.",
      },
      {
        question: "Fatura bilgilerimi nasıl girebilirim?",
        answer:
          "Sipariş sırasında fatura bilgilerinizi (bireysel veya kurumsal) girebilirsiniz. E-arşiv fatura, siparişiniz onaylandıktan sonra e-posta adresinize otomatik olarak gönderilir.",
      },
    ],
  },
  {
    title: "Kargo ve Teslimat",
    items: [
      {
        question: "Kargo ücreti ne kadar?",
        answer:
          "300 TL ve üzeri siparişlerde kargo tamamen ücretsizdir. 300 TL altındaki siparişlerde standart kargo ücreti 90 TL'dir.",
      },
      {
        question: "Siparişim ne zaman teslim edilir?",
        answer:
          "Siparişleriniz ödemenin onaylanmasından itibaren 1-3 iş günü içinde teslim edilir. Teslimat süresi bulunduğunuz bölgeye ve kargo yoğunluğuna göre değişiklik gösterebilir. Marmara Bölgesi için teslimat genellikle 1 iş günü içerisinde gerçekleşir.",
      },
      {
        question: "Kargomu nasıl takip edebilirim?",
        answer:
          "Siparişleriniz kargoya verildiğinde kargo takip numaranız e-posta ve SMS ile tarafınıza iletilir. Ayrıca Hesabım > Siparişlerim sayfasından kargo takip bilgilerinize ulaşabilirsiniz.",
      },
      {
        question: "Yurt dışına gönderim yapıyor musunuz?",
        answer:
          "Şu an için sadece Türkiye genelinde 81 ile teslimat yapmaktayız. Yurt dışı gönderim hizmetimiz henüz bulunmamaktadır.",
      },
    ],
  },
  {
    title: "İade ve Değişim",
    items: [
      {
        question: "İade koşulları nelerdir?",
        answer:
          "Ürünü teslim aldığınız tarihten itibaren 14 gün içinde iade talebinde bulunabilirsiniz. İade edilecek ürünlerin kullanılmamış, yıkanmamış ve orijinal etiketleri sökülmemiş olması gerekmektedir.",
      },
      {
        question: "İç giyim ürünleri iade edilebilir mi?",
        answer:
          "Hijyen koşulları gereği, ambalajı açılmış iç giyim ürünleri (boxer, külot vb.) iade edilememektedir. Ambalajı açılmamış, denenmemiş ürünler iade edilebilir. Bu kural 6502 sayılı Tüketicinin Korunması Hakkında Kanun'un 15. maddesi gereği uygulanmaktadır.",
      },
      {
        question: "İade süreci nasıl işliyor?",
        answer:
          "İade talebinizi Hesabım > Siparişlerim sayfasından veya iletişim kanallarımızdan iletebilirsiniz. Talebiniz onaylandıktan sonra ürünü bize göndermeniz gerekmektedir. Ürün tarafımıza ulaştıktan ve kontrolü yapıldıktan sonra ödemeniz 5-10 iş günü içinde kredi kartınıza iade edilir.",
      },
      {
        question: "Beden değişimi yapabilir miyim?",
        answer:
          "Evet, aynı iade koşulları geçerli olmak üzere beden değişimi yapabilirsiniz. Değişim talebinizi müşteri hizmetlerimize ilettikten sonra ürünü bize gönderebilirsiniz.",
      },
    ],
  },
  {
    title: "Beden Rehberi",
    items: [
      {
        question: "Hangi bedenlerde ürünleriniz mevcut?",
        answer:
          "Ürünlerimiz S, M, L, XL ve XXL beden seçeneklerinde mevcuttur. Erkek boxer ve kadın külot ürünlerimizin tamamı bu 5 beden seçeneğinde sunulmaktadır.",
      },
      {
        question: "Beden seçiminde nasıl karar verebilirim?",
        answer:
          "Her ürün sayfasında detaylı beden tablosu yer almaktadır. Genel olarak: S (36-38), M (38-40), L (40-42), XL (42-44), XXL (44-46) beden aralığına karşılık gelmektedir. Modal kumaşta esnek yapı olduğu için bedeninize en yakın seçeneği tercih edebilirsiniz.",
      },
      {
        question: "Bedenimi yanlış seçtim, ne yapabilirim?",
        answer:
          "Ürün ambalajı açılmamışsa beden değişimi yapabilirsiniz. İade ve değişim koşullarımız dahilinde yeni bedenle değişim talebinde bulunabilirsiniz.",
      },
    ],
  },
  {
    title: "Toptan Satış ve Bayilik",
    items: [
      {
        question: "Toptan satış yapıyor musunuz?",
        answer:
          "Evet, Vorte Tekstil toptan satış ve bayilik sistemi ile çalışmaktadır. Bayilerimize özel toptan fiyatlar, öncelikli kargo ve özel bayi paneli sunulmaktadır.",
      },
      {
        question: "Bayilik başvurusu nasıl yapılır?",
        answer:
          "Bayilik başvurunuzu iletişim sayfamızdan veya doğrudan 0537 622 06 94 numarasını arayarak yapabilirsiniz. Başvurunuz değerlendirilip onaylandıktan sonra özel bayi kodunuz ve giriş bilgileriniz tarafınıza iletilir.",
      },
      {
        question: "Bayi olarak hangi avantajlardan yararlanabilirim?",
        answer:
          "Bayilerimiz özel indirimli toptan fiyatlardan, öncelikli kargo hizmetinden, özel bayi panelinden ve kişisel bayi temsilcisinden yararlanabilir. Detaylı bilgi için Toptan Satış sayfamızı ziyaret edebilirsiniz.",
      },
    ],
  },
  {
    title: "Ürün Bakımı",
    items: [
      {
        question: "Modal kumaşı nasıl yıkamam gerekiyor?",
        answer:
          "Modal kumaşı 30 derece veya daha düşük sıcaklıkta, hassas programda yıkamanızı öneririz. Çamaşır makinesinin devir sayısını düşük tutun. Ağartıcı kullanmayın. Düz kurutma veya düşük ısıda kurutma makinesi kullanabilirsiniz.",
      },
      {
        question: "Ürünleri ütüleyebilir miyim?",
        answer:
          "Modal kumaşı düşük ısıda ütülenmesi önerilen bir kumaştır. Yüksek ısıda ütülemekten kaçınmanızı tavsiye ederiz. Genellikle modal kumaşı yıkama sonrası fazla buruşmadığından ütü gerektirmez.",
      },
      {
        question: "Ürünlerin ömrü ne kadar?",
        answer:
          "Doğru bakım koşullarına uyulduğunda modal kumaşı ürünlerimiz uzun süre form ve rengini korur. Modal, doğal kaynaklardan elde edilen, dayanıklı ve yumuşak bir kumaştır. Ürünlerinizin ömrünü uzatmak için bakım etiketindeki talimatlara uymanızı öneririz.",
      },
    ],
  },
  {
    title: "Hesap ve Güvenlik",
    items: [
      {
        question: "Nasıl üyelik oluşturabilirim?",
        answer:
          "Sitemizin sağ üstündeki Giriş Yap butonuna tıklayarak Kayıt Ol sayfasına ulaşabilirsiniz. Ad, soyad, e-posta ve şifrenizi girerek hızlıca üyelik oluşturabilirsiniz.",
      },
      {
        question: "Şifremi unuttum, ne yapmalıyım?",
        answer:
          "Giriş sayfasındaki Şifremi Unuttum linkine tıklayarak e-posta adresinize şifre sıfırlama bağlantısı gönderebilirsiniz. Bağlantı üzerinden yeni şifrenizi belirleyebilirsiniz.",
      },
      {
        question: "Kişisel bilgilerim güvende mi?",
        answer:
          "Evet. Vorte Tekstil olarak KVKK (6698 Sayılı Kişisel Verilerin Korunması Kanunu) kapsamında tüm kişisel verileriniz güvenli bir şekilde saklanmakta ve üçüncü kişilerle paylaşılmamaktadır. Detaylı bilgi için Gizlilik Politikası ve KVKK sayfalarımızı inceleyebilirsiniz.",
      },
    ],
  },
];

function AccordionItem({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-[#7AC143]"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium text-gray-900">
          {item.question}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-200 ${
          isOpen ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-sm leading-relaxed text-gray-600">{item.answer}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.flatMap((section) =>
      section.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      }))
    ),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <JsonLd data={faqJsonLd} />
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: "Sıkça Sorulan Sorular" },
        ]}
      />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">
        Sıkça Sorulan Sorular
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        Merak ettiğiniz soruların cevaplarını aşağıda bulabilirsiniz.
        Aradığınız cevabı bulamadıysanız iletişim sayfamızdan bize
        ulaşabilirsiniz.
      </p>

      <div className="mt-8 space-y-8">
        {faqData.map((section) => (
          <section key={section.title}>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-gray-900">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7AC143]" />
              {section.title}
            </h2>
            <div className="rounded-lg border border-gray-200 px-4">
              {section.items.map((item) => (
                <AccordionItem key={item.question} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-10 rounded-lg bg-[#333333] p-6 text-center text-white">
        <p className="text-lg font-bold">Başka sorularınız mı var?</p>
        <p className="mt-1 text-sm text-gray-300">
          Cevabını bulamadığınız sorular için bize doğrudan ulaşabilirsiniz.
        </p>
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/iletisim"
            className="inline-block rounded-lg bg-[#7AC143] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6aad38]"
          >
            İletişime Geçin
          </Link>
          <a
            href="tel:+905376220694"
            className="inline-block rounded-lg border border-white/30 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            0537 622 06 94
          </a>
        </div>
      </div>
    </div>
  );
}
