"use client";

import { SizeGuide } from "@/components/product/SizeGuide";

interface SizeOption {
  size: string;
  stock: number;
  variantId: string;
}

interface SizeSelectorProps {
  sizes: SizeOption[];
  selectedSize: string;
  onSelect: (size: string) => void;
  gender?: "erkek" | "kadın";
}

export function SizeSelector({ sizes, selectedSize, onSelect, gender }: SizeSelectorProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Beden:</span>
          {selectedSize && (
            <span className="text-sm text-gray-500">{selectedSize}</span>
          )}
        </div>
        {gender ? (
          <SizeGuide gender={gender} />
        ) : (
          <button className="text-xs text-gray-400 underline hover:text-gray-600">
            Beden Tablosu
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {sizes.map((s) => {
          const isSelected = selectedSize === s.size;
          const isOutOfStock = s.stock === 0;

          return (
            <button
              key={s.size}
              onClick={() => !isOutOfStock && onSelect(s.size)}
              disabled={isOutOfStock}
              className={`relative min-w-[48px] rounded border px-3 py-2 text-sm font-medium transition-all ${
                isSelected
                  ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                  : isOutOfStock
                    ? "border-gray-200 text-gray-300 line-through cursor-not-allowed"
                    : "border-gray-300 text-gray-700 hover:border-gray-500"
              }`}
            >
              {s.size}
              {!isOutOfStock && s.stock <= 3 && (
                <span className="absolute -right-1 -top-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
