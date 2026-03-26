"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { RecentlyViewedItem } from "@/hooks/useRecentlyViewed";

function formatPrice(value: number): string {
  return `₺${value.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
}

export function RecentlyViewed({ excludeId }: { excludeId?: string } = {}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("recently-viewed");
      if (stored) {
        const parsed = JSON.parse(stored) as RecentlyViewedItem[];
        if (parsed.length > 0) setItems(parsed);
      }
    } catch {
      // localStorage erişim hatası
    }
  }, []);

  const filtered = excludeId ? items.filter((i) => i.id !== excludeId) : items;
  if (filtered.length < 2) return null;

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  return (
    <section className="border-t border-gray-100 bg-white py-16 md:py-20">
      <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
        <div className="mb-8 text-center">
          <p
            className="text-[10px] font-medium uppercase text-gray-400 md:text-[11px]"
            style={{ letterSpacing: "0.35em" }}
          >
            Geçmişe Bakış
          </p>
          <div className="mx-auto mt-4 mb-5 h-px w-10 bg-[#1A1A1A]" />
          <h2
            className="text-xl font-light uppercase text-[#1A1A1A] md:text-2xl"
            style={{ letterSpacing: "0.15em" }}
          >
            Son Görüntülenenler
          </h2>
        </div>

        <div className="relative">
          <button
            onClick={() => scroll("left")}
            className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 shadow-sm transition-all hover:shadow-md md:block"
            aria-label="Önceki ürünler"
          >
            <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div
            ref={scrollRef}
            className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {filtered.map((item) => (
              <Link
                key={item.id}
                href={`/urun/${item.slug}`}
                className="group w-[200px] flex-shrink-0 snap-start md:w-[240px]"
              >
                <div className="aspect-square overflow-hidden rounded-xl bg-gray-50">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={240}
                    height={240}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <p className="mt-3 text-xs font-medium text-[#1A1A1A] line-clamp-1 group-hover:text-gray-500 transition-colors">
                  {item.name}
                </p>
                <p className="mt-1 text-xs text-gray-500">{formatPrice(item.price)}</p>
              </Link>
            ))}
          </div>

          <button
            onClick={() => scroll("right")}
            className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 shadow-sm transition-all hover:shadow-md md:block"
            aria-label="Sonraki ürünler"
          >
            <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
