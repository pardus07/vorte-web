"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface SlideData {
  imageDesktop: string;
  imageMobile: string;
  subtitle?: string | null;
  title?: string | null;
  highlight?: string | null;
  description?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
  secondaryButtonText?: string | null;
  secondaryButtonLink?: string | null;
  altText?: string | null;
}

const fallbackSlides: SlideData[] = [
  {
    imageDesktop: "/images/hero-1.jpg",
    imageMobile: "/images/hero-mobile-1.jpg",
    subtitle: "Yeni Sezon 2026",
    title: "Kaliteli İç Giyim,",
    highlight: "Uygun Fiyat",
    description:
      "Vorte Tekstil - Erkek boxer ve kadın iç giyim koleksiyonu. Premium kumaş kalitesi ile konfor ve şıklık bir arada.",
    buttonText: "Erkek Koleksiyonu",
    buttonLink: "/erkek-ic-giyim",
    secondaryButtonText: "Kadın Koleksiyonu",
    secondaryButtonLink: "/kadin-ic-giyim",
  },
  {
    imageDesktop: "/images/hero-2.jpg",
    imageMobile: "/images/hero-mobile-2.jpg",
    subtitle: "Kadın Koleksiyonu",
    title: "Zarif Tasarım,",
    highlight: "Üstün Konfor",
    description:
      "Premium modal kumaş ile üretilen kadın iç giyim koleksiyonumuz. Günlük konfor ve şıklığı bir arada sunuyor.",
    buttonText: "Kadın Koleksiyonu",
    buttonLink: "/kadin-ic-giyim",
    secondaryButtonText: "Erkek Koleksiyonu",
    secondaryButtonLink: "/erkek-ic-giyim",
  },
  {
    imageDesktop: "/images/hero-3.jpg",
    imageMobile: "/images/hero-mobile-3.jpg",
    subtitle: "Toptan Satış",
    title: "Bayilik Fırsatı,",
    highlight: "%45'e Varan İndirim",
    description:
      "Perakende satış noktaları için özel toptan fiyatlardan yararlanın.",
    buttonText: "Toptan Satış",
    buttonLink: "/toptan",
    secondaryButtonText: "Bayi Girişi",
    secondaryButtonLink: "/bayi-girisi",
  },
];

interface HeroSliderProps {
  slides?: SlideData[];
}

export function HeroSlider({ slides: propSlides }: HeroSliderProps) {
  const slides = propSlides && propSlides.length > 0 ? propSlides : fallbackSlides;
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = slides[current];

  return (
    <section className="relative h-[85vh] min-h-[600px] w-full overflow-hidden bg-[#1A1A1A]">
      {/* Background Images */}
      {slides.map((s, i) => {
        const alt = s.altText || `Vorte Tekstil - ${s.title || ""} ${s.highlight || ""}`;
        const isActive = i === current;
        const isFirst = i === 0;
        return (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Desktop */}
            <Image
              src={s.imageDesktop}
              alt={alt}
              fill
              className="hidden md:block object-cover object-center"
              priority={isFirst}
              loading={isFirst ? "eager" : "lazy"}
              sizes="100vw"
              quality={80}
            />
            {/* Mobile */}
            <Image
              src={s.imageMobile}
              alt={alt}
              fill
              className="block md:hidden object-cover object-center"
              priority={isFirst}
              loading={isFirst ? "eager" : "lazy"}
              sizes="100vw"
              quality={80}
            />
          </div>
        );
      })}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A]/80 via-[#1A1A1A]/40 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 flex h-full items-center">
        <div className="mx-auto w-full max-w-[1440px] px-4 lg:px-8">
          <div className="max-w-xl">
            {slide.subtitle && (
              <span className="inline-block mb-4 text-sm font-semibold tracking-widest text-[#7AC143] uppercase">
                {slide.subtitle}
              </span>
            )}
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              {slide.title}
              {slide.highlight && (
                <>
                  <br />
                  <span className="text-[#7AC143]">{slide.highlight}</span>
                </>
              )}
            </h1>
            {slide.description && (
              <p className="mt-4 text-lg text-gray-300">{slide.description}</p>
            )}
            <div className="mt-8 flex flex-wrap gap-4">
              {slide.buttonText && slide.buttonLink && (
                <Link href={slide.buttonLink}>
                  <Button size="lg" variant="primary">
                    {slide.buttonText}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              {slide.secondaryButtonText && slide.secondaryButtonLink && (
                <Link href={slide.secondaryButtonLink}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-[#1A1A1A]"
                  >
                    {slide.secondaryButtonText}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
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
        </>
      )}
    </section>
  );
}
