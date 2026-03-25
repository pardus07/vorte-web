"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface StickyCartBarProps {
  productName: string;
  price: number;
  sizes: string[];
  onAddToCart: (size: string) => void;
  targetRef: React.RefObject<HTMLElement | null>;
  isOutOfStock?: boolean;
}

export function StickyCartBar({
  productName,
  price,
  sizes,
  onAddToCart,
  targetRef,
  isOutOfStock = false,
}: StickyCartBarProps) {
  const [visible, setVisible] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [targetRef]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-gray-200 bg-white/95 shadow-lg backdrop-blur-sm transition-transform duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#1A1A1A]">{productName}</p>
          <p className="text-sm font-bold text-[#1A1A1A]">{formatPrice(price)}</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
          >
            <option value="">Beden</option>
            {sizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            onClick={() => {
              if (selectedSize) onAddToCart(selectedSize);
            }}
            disabled={isOutOfStock || !selectedSize}
            className="flex items-center gap-2 rounded-lg bg-[#1A1A1A] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Sepete Ekle</span>
          </button>
        </div>
      </div>
    </div>
  );
}
