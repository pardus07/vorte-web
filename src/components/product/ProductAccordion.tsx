"use client";

import { useState } from "react";
import { ChevronDown, CreditCard, Truck, RotateCcw } from "lucide-react";

interface AccordionItem {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export function ProductAccordion({ description }: { description?: string | null }) {
  const items: AccordionItem[] = [
    ...(description
      ? [
          {
            title: "Ürün Özellikleri",
            icon: <span className="text-lg">📋</span>,
            content: <DescriptionRenderer text={description} />,
          },
        ]
      : []),
    {
      title: "Ödeme Seçenekleri",
      icon: <CreditCard className="h-5 w-5 text-gray-500" />,
      content: (
        <div className="space-y-2 text-sm text-gray-600">
          <p>Kredi kartı ile 9 taksit imkanı</p>
          <p>Banka kartı ile tek çekim</p>
          <p>3D Secure güvenli ödeme</p>
          <p>Kapıda ödeme (Nakit / Kredi Kartı)</p>
        </div>
      ),
    },
    {
      title: "Teslimat Bilgileri",
      icon: <Truck className="h-5 w-5 text-gray-500" />,
      content: (
        <div className="space-y-2 text-sm text-gray-600">
          <p>1-3 iş günü içinde kargoya verilir</p>
          <p>200 ₺ ve üzeri siparişlerde ücretsiz kargo</p>
          <p>Geliver ile hızlı ve güvenilir teslimat</p>
        </div>
      ),
    },
    {
      title: "İade ve Değişim",
      icon: <RotateCcw className="h-5 w-5 text-gray-500" />,
      content: (
        <div className="space-y-2 text-sm text-gray-600">
          <p>14 gün içinde koşulsuz iade</p>
          <p>Hijyen koşullarına uygun, etiketi sökülmemiş ürünler iade edilebilir</p>
          <p>İade kargo ücreti alıcıya aittir</p>
        </div>
      ),
    },
  ];

  return (
    <div className="divide-y border-t">
      {items.map((item) => (
        <AccordionSection key={item.title} item={item} />
      ))}
    </div>
  );
}

/**
 * Vorte ürün açıklaması renderer
 *
 * Format kuralları:
 * - Giriş paragrafı: düz metin
 * - BÜYÜK HARF BAŞLIK veya "...?" ile biten başlıklar → <h4>
 * - "* •" veya "•" ile başlayan satırlar → liste (TEKNİK, BAKIM vb.)
 * - "• S (36-38): Bel..." → beden rehberi (tek satırda birden fazla •)
 * - SSS: Soru? + Cevap cümlesi
 */
function DescriptionRenderer({ text }: { text: string }) {
  // Önce \n\n ile blokları ayır
  const blocks = text.split(/\n\n+/);

  return (
    <div className="space-y-4 text-sm leading-relaxed text-gray-600">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // ── BÜYÜK HARF BAŞLIK ──
        // Tamamı büyük harf + Türkçe karakterler (soru işareti opsiyonel)
        // Örn: "TEKNİK ÖZELLİKLER", "SİYAH ERKEK BOXER KİMLER İÇİN İDEAL?"
        if (isHeading(trimmed)) {
          return (
            <h4
              key={i}
              className="mt-3 border-b border-gray-100 pb-1 text-sm font-bold tracking-wide text-gray-800"
            >
              {trimmed}
            </h4>
          );
        }

        // ── MADDE LİSTESİ (TEKNİK ÖZELLİKLER, BAKIM) ──
        // Satırlar "* •" veya "•" ile başlıyor
        const lines = trimmed.split("\n");
        const bulletLines = lines.filter((l) => l.trim());
        const isBulletList = bulletLines.length > 1 && bulletLines.every(
          (l) => /^\s*(\*\s*)?•/.test(l.trim())
        );

        if (isBulletList) {
          return (
            <ul key={i} className="ml-1 space-y-1.5">
              {bulletLines.map((line, j) => {
                // "* •Kumaş: ..." veya "•Kumaş: ..." → temizle
                const cleanText = line.trim().replace(/^\*?\s*•\s*/, "");
                return (
                  <li key={j} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 text-[#7AC143]">•</span>
                    <span>{cleanText}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // ── BEDEN REHBERİ (tek satırda birden fazla "•") ──
        // "• S (36-38): Bel 64–70 cm • M (38-40): Bel 70–76 cm ..."
        if (hasSingleLineBullets(trimmed)) {
          return <BedenRehberi key={i} text={trimmed} />;
        }

        // ── DÜZGÜN PARAGRAF ──
        // İçinde \n olan ama bullet olmayan bloklar — satır sonlarını koru
        if (trimmed.includes("\n")) {
          return (
            <div key={i} className="space-y-1">
              {lines.filter((l) => l.trim()).map((line, j) => (
                <p key={j}>{line.trim()}</p>
              ))}
            </div>
          );
        }

        // ── TEK PARAGRAF ──
        return <p key={i}>{trimmed}</p>;
      })}
    </div>
  );
}

/**
 * Başlık kontrolü:
 * - Tamamı BÜYÜK HARF (Türkçe dahil) + soru işareti/boşluk
 * - VEYA "?" ile biten kısa satır (SSS sorusu değil, bölüm başlığı)
 */
function isHeading(text: string): boolean {
  // Tamamı büyük harf + izin verilen karakterler (boşluk, ?, –, &, ()
  if (/^[A-ZÇĞIİÖŞÜ\s?–&()\-:0-9]+$/.test(text) && text.length > 3) {
    return true;
  }
  return false;
}

/**
 * Tek satırda birden fazla "•" var mı? (Beden Rehberi formatı)
 */
function hasSingleLineBullets(text: string): boolean {
  // Satır içinde 2+ "•" ve \n yok
  const singleLine = !text.includes("\n") || text.split("\n").filter((l) => l.trim()).length === 1;
  const bulletCount = (text.match(/•/g) || []).length;
  return singleLine && bulletCount >= 2;
}

/**
 * Beden Rehberi: "• S (36-38): Bel 64–70 cm | Kalça 88–94 cm" formatı
 * Her beden kartı olarak gösterilir
 */
function BedenRehberi({ text }: { text: string }) {
  // "•" ile split, sonra her birini temizle
  const items = text.split("•").map((s) => s.trim()).filter(Boolean);

  // Son kısmı kontrol et: "İki beden arasında..." gibi açıklama satırı olabilir
  const sizeItems: string[] = [];
  const notes: string[] = [];

  for (const item of items) {
    // Beden pattern: "S (36-38): Bel ..."
    if (/^[SMLXx]{1,3}\s*\(/.test(item) || /^(S|M|L|XL|XXL)\s/.test(item)) {
      sizeItems.push(item);
    } else {
      notes.push(item);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {sizeItems.map((size, j) => (
          <div
            key={j}
            className="rounded-md bg-gray-50 px-3 py-1.5 text-xs text-gray-700"
          >
            <span className="mr-1 font-semibold text-[#7AC143]">•</span>
            {size}
          </div>
        ))}
      </div>
      {notes.map((note, j) => (
        <p key={j} className="text-xs italic text-gray-500">
          {note}
        </p>
      ))}
    </div>
  );
}

function AccordionSection({ item }: { item: AccordionItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <div className="flex items-center gap-3">
          {item.icon}
          <span className="text-sm font-medium text-gray-800">{item.title}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && <div className="pb-4">{item.content}</div>}
    </div>
  );
}
