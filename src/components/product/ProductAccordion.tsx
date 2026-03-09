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

function DescriptionRenderer({ text }: { text: string }) {
  const blocks = text.split("\n\n");
  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-600">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        // Check if block is a list (lines starting with •)
        const lines = trimmed.split("\n");
        const isList = lines.every((l) => l.trim().startsWith("•") || l.trim() === "");
        // Check if block is a heading (ALL CAPS or ends with :)
        const isHeading = /^[A-ZÇĞIİÖŞÜ\s&]+$/.test(trimmed) || (trimmed.length < 60 && trimmed.endsWith(":"));

        if (isHeading) {
          return (
            <h4 key={i} className="mt-2 text-sm font-semibold text-gray-800">
              {trimmed.replace(/:$/, "")}
            </h4>
          );
        }
        if (isList) {
          return (
            <ul key={i} className="ml-1 space-y-1">
              {lines.filter((l) => l.trim()).map((line, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-0.5 text-green-600">•</span>
                  <span>{line.trim().replace(/^•\s*/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{trimmed}</p>;
      })}
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
