"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";

interface CarouselProduct {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  comparePrice?: number;
}

function formatPrice(value: number): string {
  return `₺${value.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
}

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  products: CarouselProduct[];
  viewAllLink?: string;
  viewAllText?: string;
}

export function ProductCarousel({
  title,
  subtitle,
  products,
  viewAllLink,
  viewAllText = "Tümünü Gör",
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            {subtitle && (
              <p
                className="text-[10px] font-medium uppercase text-gray-400 md:text-[11px]"
                style={{ letterSpacing: "0.35em" }}
              >
                {subtitle}
              </p>
            )}
            <h2
              className="mt-2 text-xl font-light uppercase text-[#1A1A1A] md:text-2xl"
              style={{ letterSpacing: "0.15em" }}
            >
              {title}
            </h2>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => scroll("left")}
              className="rounded-full border border-gray-200 p-2 transition-all hover:border-gray-400"
              aria-label="Önceki"
            >
              <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              className="rounded-full border border-gray-200 p-2 transition-all hover:border-gray-400"
              aria-label="Sonraki"
            >
              <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/urun/${p.slug}`}
              className="group w-[220px] flex-shrink-0 snap-start md:w-[280px]"
            >
              <div className="aspect-square overflow-hidden rounded-xl bg-gray-50">
                <Image
                  src={p.image}
                  alt={p.name}
                  width={280}
                  height={280}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <p className="mt-3 text-xs font-medium text-[#1A1A1A] line-clamp-1 transition-colors group-hover:text-gray-500">
                {p.name}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-[#1A1A1A]">{formatPrice(p.price)}</span>
                {p.comparePrice && p.comparePrice > p.price && (
                  <span className="text-xs text-gray-400 line-through">{formatPrice(p.comparePrice)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {viewAllLink && (
          <div className="mt-8 flex justify-center">
            <Link
              href={viewAllLink}
              className="border border-[#1A1A1A] px-8 py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A] transition-all duration-300 hover:bg-[#1A1A1A] hover:text-white"
            >
              {viewAllText}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
