"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { X, SlidersHorizontal } from "lucide-react";

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;

const COLOR_HEX: Record<string, string> = {
  Siyah: "#000000",
  Beyaz: "#FFFFFF",
  Lacivert: "#1B2A4A",
  Ten: "#D4A574",
  Gri: "#808080",
  Bordo: "#800020",
  Kırmızı: "#DC2626",
  Mavi: "#2563EB",
  Yeşil: "#16A34A",
  Pembe: "#EC4899",
  Bej: "#D4B896",
};

const PRICE_RANGES = [
  { label: "0 - 100 ₺", min: 0, max: 100 },
  { label: "100 - 200 ₺", min: 100, max: 200 },
  { label: "200 - 300 ₺", min: 200, max: 300 },
  { label: "300 ₺ +", min: 300, max: undefined },
];

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  availableColors?: string[];
}

export function FilterSidebar({ isOpen, onClose, availableColors = [] }: FilterSidebarProps) {
  const colors = availableColors.map((name) => ({
    name,
    hex: COLOR_HEX[name] || "#808080",
  }));
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedSizes = searchParams.get("size")?.split(",") || [];
  const selectedColors = searchParams.get("color")?.split(",") || [];
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const toggleArrayFilter = useCallback(
    (key: string, value: string, current: string[]) => {
      const newValues = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      updateFilter(key, newValues.length > 0 ? newValues.join(",") : null);
    },
    [updateFilter]
  );

  const clearAllFilters = useCallback(() => {
    router.push(window.location.pathname, { scroll: false });
  }, [router]);

  const hasFilters =
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    priceMin ||
    priceMax;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50 h-full w-80 overflow-y-auto bg-white p-6 shadow-xl transition-transform lg:static lg:z-auto lg:h-auto lg:w-auto lg:shadow-none lg:transition-none
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Filtreler</h2>
          </div>
          <div className="flex items-center gap-3">
            {hasFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#7AC143] hover:underline"
              >
                Temizle
              </button>
            )}
            <button onClick={onClose} className="lg:hidden">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Size filter */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">
            Beden
          </h3>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((size) => (
              <button
                key={size}
                onClick={() => toggleArrayFilter("size", size, selectedSizes)}
                className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                  selectedSizes.includes(size)
                    ? "border-[#7AC143] bg-[#7AC143] text-white"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Color filter */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">
            Renk
          </h3>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color.name}
                onClick={() =>
                  toggleArrayFilter("color", color.name, selectedColors)
                }
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${
                  selectedColors.includes(color.name)
                    ? "border-[#7AC143] bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                title={color.name}
              >
                <span
                  className="h-3 w-3 rounded-full border border-gray-300"
                  style={{ backgroundColor: color.hex }}
                />
                {color.name}
              </button>
            ))}
          </div>
        </div>

        {/* Price filter */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">
            Fiyat
          </h3>
          <div className="space-y-2">
            {PRICE_RANGES.map((range) => {
              const isSelected =
                priceMin === String(range.min) &&
                (range.max ? priceMax === String(range.max) : !priceMax);
              return (
                <button
                  key={range.label}
                  onClick={() => {
                    if (isSelected) {
                      const params = new URLSearchParams(searchParams.toString());
                      params.delete("priceMin");
                      params.delete("priceMax");
                      router.push(`?${params.toString()}`, { scroll: false });
                    } else {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("priceMin", String(range.min));
                      if (range.max) {
                        params.set("priceMax", String(range.max));
                      } else {
                        params.delete("priceMax");
                      }
                      params.delete("page");
                      router.push(`?${params.toString()}`, { scroll: false });
                    }
                  }}
                  className={`block w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? "bg-[#7AC143] text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
