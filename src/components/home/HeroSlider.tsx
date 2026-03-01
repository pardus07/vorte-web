"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

const slides = [
  {
    image: "/images/hero-1.png",
    mobileImage: "/images/hero-mobile-1.png",
    subtitle: "Yeni Sezon 2026",
    title: "Kaliteli İç Giyim,",
    highlight: "Uygun Fiyat",
    description:
      "Vorte Tekstil - Erkek boxer ve kadın iç giyim koleksiyonu. Premium kumaş kalitesi ile konfor ve şıklık bir arada.",
    primaryLink: "/erkek-ic-giyim",
    primaryLabel: "Erkek Koleksiyonu",
    secondaryLink: "/kadin-ic-giyim",
    secondaryLabel: "Kadın Koleksiyonu",
  },
  {
    image: "/images/hero-2.png",
    mobileImage: "/images/hero-mobile-2.png",
    subtitle: "Kadın Koleksiyonu",
    title: "Zarif Tasarım,",
    highlight: "Üstün Konfor",
    description:
      "Premium modal kumaş ile üretilen kadın iç giyim koleksiyonumuz. Günlük konfor ve şıklığı bir arada sunuyor.",
    primaryLink: "/kadin-ic-giyim",
    primaryLabel: "Kadın Koleksiyonu",
    secondaryLink: "/erkek-ic-giyim",
    secondaryLabel: "Erkek Koleksiyonu",
  },
  {
    image: "/images/hero-3.png",
    mobileImage: "/images/hero-mobile-1.png",
    subtitle: "Toptan Satış",
    title: "Bayilik Fırsatı,",
    highlight: "%45'e Varan İndirim",
    description:
      "Perakende satış noktaları için özel toptan fiyatlardan yararlanın.",
    primaryLink: "/toptan",
    primaryLabel: "Toptan Satış",
    secondaryLink: "/bayi-girisi",
    secondaryLabel: "Bayi Girişi",
  },
];

export function HeroSlider() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = slides[current];

  return (
    <section className="relative h-[85vh] min-h-[600px] w-full overflow-hidden bg-[#1A1A1A]">
      {/* Background Images */}
      {slides.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Desktop */}
          <Image
            src={s.image}
            alt=""
            fill
            className="hidden md:block object-cover object-center"
            priority={i === 0}
            sizes="100vw"
          />
          {/* Mobile */}
          <Image
            src={s.mobileImage}
            alt=""
            fill
            className="block md:hidden object-cover object-center"
            priority={i === 0}
            sizes="100vw"
          />
        </div>
      ))}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A]/80 via-[#1A1A1A]/40 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 flex h-full items-center">
        <div className="mx-auto w-full max-w-[1440px] px-4 lg:px-8">
          <div className="max-w-xl">
            <span className="inline-block mb-4 text-sm font-semibold tracking-widest text-[#7AC143] uppercase">
              {slide.subtitle}
            </span>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              {slide.title}
              <br />
              <span className="text-[#7AC143]">{slide.highlight}</span>
            </h1>
            <p className="mt-4 text-lg text-gray-300">{slide.description}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href={slide.primaryLink}>
                <Button size="lg" variant="primary">
                  {slide.primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={slide.secondaryLink}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-[#1A1A1A]"
                >
                  {slide.secondaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 z-30 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
        aria-label="Önceki"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 z-30 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
        aria-label="Sonraki"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${
              i === current ? "w-8 bg-[#7AC143]" : "w-2 bg-white/50"
            }`}
            aria-label={`Slayt ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
