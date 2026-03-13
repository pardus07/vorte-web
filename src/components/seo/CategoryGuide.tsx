"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface CategoryGuideProps {
  gender: "erkek" | "kadin";
}

const GUIDES: Record<string, { question: string; paragraphs: string[] }> = {
  erkek: {
    question: "Erkek iç giyimde doğru seçim nasıl yapılır?",
    paragraphs: [
      "Erkek iç çamaşırı seçiminde kumaş kalitesi en belirleyici faktördür. Taranmış penye pamuk, standart pamuktan farklı olarak yalnızca uzun elyaflardan üretilir; kumaş yüzeyi ipeksi pürüzsüz olur, kaşıntı yapmaz ve yıkama sonrası tüylenmez. %5 elastan katkısı gün boyu esneklik sağlar, boxer formunu korur ve sarkma yapmaz.",
      "Kumaş türleri arasındaki fark belirgindir: karde pamuk kısa elyaf içerdiğinden kaşıntı yapabilir ve hızla deforme olur. Sentetik kumaşlar nefes almaz, terlemeye neden olur. Taranmış penye pamuk ise her iki sorunun da çözümüdür — hem yumuşak hem dayanıklı, hem nefes alan bir yapıya sahiptir.",
      "Ofiste uzun saatler geçiren profesyoneller için penye boxer hareket özgürlüğü ve konfor sağlar. Spor yapanlar için yüksek nem emiciliği terlemeyi kontrol altında tutar. Hassas cilde sahip olanlar için overlok dikiş tekniği cilt tahrişi riskini en aza indirir. Koyu renkli pantolon ve takım elbise altında siyah veya lacivert boxer görünmez kalır; gri ise günlük kullanımda en çok yönlü seçenektir.",
      "Beden seçiminde bel çevrenizi göbek hizasından ölçün; iki beden arasında kalırsanız büyük bedeni tercih edin. Bakımda 30°C yıkama ve asarak kurutma kumaş ömrünü uzatır.",
      "Aşağıdaki koleksiyonda tüm renk ve beden seçeneklerini inceleyebilirsiniz.",
    ],
  },
  kadin: {
    question: "Kadın iç giyimde doğru seçim nasıl yapılır?",
    paragraphs: [
      "Kadın iç çamaşırı seçiminde kumaş kalitesi ve hijyen birlikte değerlendirilmelidir. Taranmış penye pamuk, pürüzsüz yüzey yapısıyla cilt tahrişi riskini en aza indirir. Ağ bölgesinde kullanılan %100 saf pamuk iç katman, hassas bölgede maksimum hava geçirgenliği ve hijyen sağlar — sentetik iç astarların aksine nem tutmaz ve bakteri oluşumunu azaltır.",
      "Kumaş karşılaştırmasında fark nettir: karde pamuk kısa elyaf nedeniyle zamanla sertleşir ve kaşıntı yapabilir. Sentetik kumaşlar nefes almaz, özellikle sıcak havalarda rahatsızlık verir. Taranmış penye pamuk ise uzun elyaf yapısıyla yumuşaklığını yıkamalar boyunca korur ve cilde en dost seçenektir.",
      "Günlük kullanımda siyah külot her kıyafetin altına uyum sağlar ve en pratik tercihtir. Ten rengi, ince kumaşlı elbise ve etek altında görünmez kalır — özellikle düğün ve davetlerde güvenle tercih edilir. Beyaz ise açık renkli yazlık kıyafetlerle ferah bir kombinasyon oluşturur. Hassas cilde sahip hanımlar ve hijyeni ön planda tutanlar için saf pamuk iç katman ekstra güvence sunar.",
      "Beden seçiminde kalça çevrenizi en geniş noktadan ölçün; iki beden arasındaysanız büyük bedeni tercih edin. 30°C yıkama ve asarak kurutma kumaş kalitesini korur.",
      "Aşağıdaki koleksiyonda tüm renk ve beden seçeneklerini inceleyebilirsiniz.",
    ],
  },
};

export function CategoryGuide({ gender }: CategoryGuideProps) {
  const [expanded, setExpanded] = useState(false);
  const guide = GUIDES[gender];
  if (!guide) return null;

  // İlk 2 paragrafı her zaman göster, geri kalanı toggle ile
  const visibleParagraphs = guide.paragraphs.slice(0, 2);
  const hiddenParagraphs = guide.paragraphs.slice(2);

  return (
    <section className="mb-6 rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm md:p-6">
      {/* Başlık — AEO sorusu */}
      <h2 className="text-base font-bold text-gray-800 md:text-lg">
        {guide.question}
      </h2>

      {/* Her zaman görünen paragraflar */}
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-600">
        {visibleParagraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {/* Toggle ile açılan geri kalan paragraflar */}
      {hiddenParagraphs.length > 0 && (
        <>
          {expanded && (
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-600">
              {hiddenParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-[#7AC143] hover:text-[#6aad38] transition-colors"
          >
            {expanded ? "Daha az göster" : "Devamını oku"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </>
      )}
    </section>
  );
}
