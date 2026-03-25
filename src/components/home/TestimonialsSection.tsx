"use client";

import { useRef } from "react";

interface Testimonial {
  id: string;
  name: string;
  title: string | null;
  rating: number;
  comment: string;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (testimonials.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 360;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
        <div className="mb-12 text-center">
          <p
            className="text-[10px] font-medium uppercase text-gray-400 md:text-[11px]"
            style={{ letterSpacing: "0.35em" }}
          >
            Müşterilerimiz
          </p>
          <div className="mx-auto mt-4 mb-5 h-px w-10 bg-[#1A1A1A]" />
          <h2
            className="text-xl font-light uppercase text-[#1A1A1A] md:text-2xl"
            style={{ letterSpacing: "0.15em" }}
          >
            Ne Diyorlar?
          </h2>
        </div>

        <div className="relative">
          {/* Sol ok */}
          <button
            onClick={() => scroll("left")}
            className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 shadow-sm transition-all hover:shadow-md md:block"
            aria-label="Önceki yorumlar"
          >
            <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Scroll konteyner */}
          <div
            ref={scrollRef}
            className="scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="w-[320px] flex-shrink-0 snap-start rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <Stars rating={t.rating} />
                <p className="mt-4 text-sm leading-relaxed text-gray-600 line-clamp-4">
                  &ldquo;{t.comment}&rdquo;
                </p>
                <div className="mt-5 border-t border-gray-50 pt-4">
                  <p className="text-sm font-medium text-[#1A1A1A]">{t.name}</p>
                  {t.title && (
                    <p className="mt-0.5 text-xs text-gray-400">{t.title}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Sağ ok */}
          <button
            onClick={() => scroll("right")}
            className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 shadow-sm transition-all hover:shadow-md md:block"
            aria-label="Sonraki yorumlar"
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
