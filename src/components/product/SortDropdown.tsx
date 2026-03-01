"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const SORT_OPTIONS = [
  { label: "Önerilen", value: "" },
  { label: "En Yeni", value: "newest" },
  { label: "Fiyat: Düşükten Yükseğe", value: "price_asc" },
  { label: "Fiyat: Yüksekten Düşüğe", value: "price_desc" },
  { label: "En Çok Satan", value: "bestseller" },
];

export function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentSort = searchParams.get("sort") || "";
  const currentLabel =
    SORT_OPTIONS.find((o) => o.value === currentSort)?.label || "Önerilen";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    router.push(`?${params.toString()}`, { scroll: false });
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:border-gray-400"
      >
        <span>Sırala: {currentLabel}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSort(option.value)}
              className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                currentSort === option.value
                  ? "bg-green-50 font-medium text-[#7AC143]"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
