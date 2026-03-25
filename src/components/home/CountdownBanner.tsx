"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CountdownBannerProps {
  endDate: string; // ISO date
  title?: string;
  subtitle?: string;
  link?: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function CountdownBanner({
  endDate,
  title = "Kampanya Devam Ediyor",
  subtitle = "Fırsatı kaçırmayın!",
  link = "/erkek-ic-giyim",
}: CountdownBannerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const target = new Date(endDate).getTime();

    const update = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setExpired(true);
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (expired) return null;

  const blocks = [
    { value: timeLeft.days, label: "Gün" },
    { value: timeLeft.hours, label: "Saat" },
    { value: timeLeft.minutes, label: "Dakika" },
    { value: timeLeft.seconds, label: "Saniye" },
  ];

  return (
    <section className="bg-[#1A1A1A] py-8">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-5 px-4 md:flex-row md:justify-between">
        <div className="text-center md:text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#7AC143]">
            {subtitle}
          </p>
          <h3 className="mt-1 text-lg font-light uppercase tracking-wider text-white md:text-xl">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {blocks.map((b, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-lg font-semibold tabular-nums text-white md:h-14 md:w-14 md:text-xl">
                {pad(b.value)}
              </span>
              <span className="mt-1.5 text-[9px] uppercase tracking-wider text-white/40">
                {b.label}
              </span>
            </div>
          ))}
        </div>

        <Link
          href={link}
          className="border border-[#7AC143] px-6 py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[#7AC143] transition-all duration-300 hover:bg-[#7AC143] hover:text-white"
        >
          Alışverişe Başla
        </Link>
      </div>
    </section>
  );
}
