"use client";

import { useState, useEffect, useCallback, useRef, TouchEvent } from "react";
import Link from "next/link";

// ---- Legacy interface (DB slides backward compat) ----
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

// ---- Video slide type ----
interface VideoSlide {
  video: string;
  poster: string;
  subtitle: string;
  title: string;
  buttonText: string;
  buttonLink: string;
}

const videoSlides: VideoSlide[] = [
  {
    video: "/videos/hero/optimized/cotton-field.mp4",
    poster: "/videos/hero/optimized/cotton-field-poster.webp",
    subtitle: "%100 Saf Pamuk",
    title: "Doğadan Teninize",
    buttonText: "Koleksiyonu Keşfet",
    buttonLink: "/erkek-ic-giyim",
  },
  {
    video: "/videos/hero/optimized/textile-production.mp4",
    poster: "/videos/hero/optimized/textile-production-poster.webp",
    subtitle: "Bursa'dan Türkiye'ye",
    title: "35 Yıllık Deneyim",
    buttonText: "Hakkımızda",
    buttonLink: "/hakkimizda",
  },
  {
    video: "/videos/hero/optimized/fabric-texture.mp4",
    poster: "/videos/hero/optimized/fabric-texture-poster.webp",
    subtitle: "Eşsiz Konfor",
    title: "Premium Penye",
    buttonText: "Ürünleri İncele",
    buttonLink: "/erkek-ic-giyim",
  },
  {
    video: "/videos/hero/optimized/cotton-macro.mp4",
    poster: "/videos/hero/optimized/cotton-macro-poster.webp",
    subtitle: "Ring İplik Teknolojisi",
    title: "Taranmış Pamuk",
    buttonText: "Detaylı Bilgi",
    buttonLink: "/hakkimizda",
  },
  {
    video: "/videos/hero/optimized/water-pure.mp4",
    poster: "/videos/hero/optimized/water-pure-poster.webp",
    subtitle: "OEKO-TEX Sertifikalı",
    title: "Doğal Saflık",
    buttonText: "Sertifikalarımız",
    buttonLink: "/hakkimizda",
  },
  {
    video: "/videos/hero/optimized/golden-hour.mp4",
    poster: "/videos/hero/optimized/golden-hour-poster.webp",
    subtitle: "2026 Koleksiyonu",
    title: "Yeni Sezon",
    buttonText: "Yeni Ürünler",
    buttonLink: "/kadin-ic-giyim",
  },
  {
    video: "/videos/hero/optimized/cotton-harvest.mp4",
    poster: "/videos/hero/optimized/cotton-harvest-poster.webp",
    subtitle: "Bayilik Fırsatları",
    title: "Toptan Satış",
    buttonText: "Bayi Başvurusu",
    buttonLink: "/toptan",
  },
];

// ---- Props ----
interface HeroSliderProps {
  slides?: SlideData[];
}

// ---- Component ----
export function HeroSlider({ slides: propSlides }: HeroSliderProps) {
  // If DB slides provided, render legacy image slider
  const hasDbSlides = propSlides && propSlides.length > 0;

  if (hasDbSlides) {
    return <LegacyImageSlider slides={propSlides} />;
  }

  return <VideoHeroSlider />;
}

// =========================================================================
// VIDEO HERO SLIDER (Zara style)
// =========================================================================
function VideoHeroSlider() {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const total = videoSlides.length;

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Go to slide
  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning || index === current) return;
      setIsTransitioning(true);
      setCurrent(index);
      setTimeout(() => setIsTransitioning(false), 1000);
    },
    [current, isTransitioning]
  );

  const next = useCallback(() => {
    goTo((current + 1) % total);
  }, [current, total, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + total) % total);
  }, [current, total, goTo]);

  // Auto-advance every 8 seconds
  useEffect(() => {
    timerRef.current = setTimeout(next, 8000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, next]);

  // Play/pause videos based on active slide
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === current) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [current]);

  // Touch handlers
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only trigger if horizontal swipe is dominant and > 50px
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
  };

  return (
    <section
      className="relative h-[100svh] w-full overflow-hidden bg-[#1A1A1A] md:h-screen"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Video layers */}
      {videoSlides.map((slide, i) => {
        const isActive = i === current;
        const isFirst = i === 0;
        return (
          <div
            key={i}
            className="absolute inset-0 will-change-[opacity]"
            style={{
              opacity: isActive ? 1 : 0,
              transition: "opacity 1s ease-in-out",
              zIndex: isActive ? 2 : 1,
            }}
            aria-hidden={!isActive}
          >
            {reducedMotion ? (
              /* Static poster for reduced motion */
              <img
                src={slide.poster}
                alt=""
                className="h-full w-full object-cover"
                loading={isFirst ? "eager" : "lazy"}
              />
            ) : (
              <video
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                src={isFirst || isActive ? slide.video : undefined}
                poster={slide.poster}
                autoPlay={isFirst}
                muted
                loop
                playsInline
                preload={isFirst ? "auto" : "none"}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        );
      })}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.05) 70%, transparent 100%)",
        }}
      />

      {/* Content — centered bottom area, Zara style */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-28 md:pb-32 lg:pb-36">
        {videoSlides.map((slide, i) => {
          const isActive = i === current;
          return (
            <div
              key={i}
              className="absolute inset-0 flex flex-col items-center justify-end pb-28 md:pb-32 lg:pb-36 will-change-[opacity,transform]"
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.8s ease-in-out 0.2s, transform 0.8s ease-in-out 0.2s",
                pointerEvents: isActive ? "auto" : "none",
              }}
            >
              {/* Subtitle */}
              <p
                className="mb-3 text-xs font-light uppercase text-white/80 md:mb-4 md:text-sm"
                style={{ letterSpacing: "0.3em" }}
              >
                {slide.subtitle}
              </p>

              {/* Title */}
              <h1
                className="text-center font-light uppercase text-white text-4xl md:text-6xl lg:text-7xl xl:text-8xl"
                style={{ letterSpacing: "0.15em", lineHeight: 1.1 }}
              >
                {slide.title}
              </h1>

              {/* CTA */}
              <Link
                href={slide.buttonLink}
                className="mt-6 inline-block border border-white/80 bg-transparent px-8 py-3 text-[11px] font-light uppercase text-white transition-all duration-300 hover:bg-white hover:text-[#1A1A1A] md:mt-8 md:px-10 md:py-3.5 md:text-xs"
                style={{ letterSpacing: "0.25em" }}
              >
                {slide.buttonText}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Giant VORTE logo — right-aligned vertical, Zara style */}
      <div className="absolute right-0 top-0 z-[15] h-full select-none pointer-events-none flex items-end justify-end">
        <img
          src="/images/vorte-logo-white.png"
          alt=""
          className="h-[75%] w-auto object-contain object-right-bottom opacity-50 mr-2 mb-16 md:h-[80%] md:mr-6 md:mb-20 lg:mr-10"
          aria-hidden="true"
          draggable={false}
        />
      </div>

      {/* Navigation dots — Zara style thin bars */}
      <div className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 md:bottom-10">
        {videoSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="group relative h-5 flex items-center"
            aria-label={`Slayt ${i + 1}`}
            aria-current={i === current ? "true" : undefined}
          >
            <span
              className="block h-[2px] rounded-full bg-white/40 transition-all duration-500 group-hover:bg-white/70"
              style={{
                width: i === current ? "32px" : "12px",
                backgroundColor: i === current ? "rgba(255,255,255,0.9)" : undefined,
              }}
            />
          </button>
        ))}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60 md:bottom-3">
        <svg
          className="h-4 w-4 animate-bounce text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

// =========================================================================
// LEGACY IMAGE SLIDER (backward compat for DB slides)
// =========================================================================
function LegacyImageSlider({ slides }: { slides: SlideData[] }) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = slides[current];

  return (
    <section className="relative h-[100svh] w-full overflow-hidden bg-[#1A1A1A] md:h-screen">
      {slides.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            opacity: i === current ? 1 : 0,
            transition: "opacity 1s ease-in-out",
            zIndex: i === current ? 2 : 1,
          }}
        >
          <img
            src={s.imageDesktop}
            alt={s.altText || `${s.title || ""} ${s.highlight || ""}`}
            className="hidden h-full w-full object-cover md:block"
            loading={i === 0 ? "eager" : "lazy"}
          />
          <img
            src={s.imageMobile}
            alt={s.altText || `${s.title || ""} ${s.highlight || ""}`}
            className="block h-full w-full object-cover md:hidden"
            loading={i === 0 ? "eager" : "lazy"}
          />
        </div>
      ))}

      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 40%, transparent 100%)",
        }}
      />

      <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-28 md:pb-32">
        {slide?.subtitle && (
          <p
            className="mb-3 text-xs font-light uppercase text-white/80 md:text-sm"
            style={{ letterSpacing: "0.3em" }}
          >
            {slide.subtitle}
          </p>
        )}
        <h1
          className="text-center font-light uppercase text-white text-4xl md:text-6xl lg:text-7xl"
          style={{ letterSpacing: "0.15em", lineHeight: 1.1 }}
        >
          {slide?.title}
          {slide?.highlight && (
            <span className="block text-[#7AC143]">{slide.highlight}</span>
          )}
        </h1>
        {slide?.buttonText && slide?.buttonLink && (
          <Link
            href={slide.buttonLink}
            className="mt-6 inline-block border border-white/80 px-8 py-3 text-[11px] font-light uppercase text-white transition-all duration-300 hover:bg-white hover:text-[#1A1A1A] md:mt-8 md:px-10 md:py-3.5 md:text-xs"
            style={{ letterSpacing: "0.25em" }}
          >
            {slide.buttonText}
          </Link>
        )}
      </div>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="group relative flex h-5 items-center"
            aria-label={`Slayt ${i + 1}`}
          >
            <span
              className="block h-[2px] rounded-full bg-white/40 transition-all duration-500 group-hover:bg-white/70"
              style={{
                width: i === current ? "32px" : "12px",
                backgroundColor: i === current ? "rgba(255,255,255,0.9)" : undefined,
              }}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
