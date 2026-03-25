"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, ArrowRight } from "lucide-react";

interface CompareItem {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
}

const STORAGE_KEY = "compare-products";
const MAX_COMPARE = 3;

function getCompareItems(): CompareItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToCompare(item: CompareItem): boolean {
  const items = getCompareItems();
  if (items.length >= MAX_COMPARE) return false;
  if (items.some((i) => i.id === item.id)) return false;
  const updated = [...items, item];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("compare-updated"));
  return true;
}

export function removeFromCompare(id: string) {
  const items = getCompareItems().filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("compare-updated"));
}

export function isInCompare(id: string): boolean {
  return getCompareItems().some((i) => i.id === id);
}

function formatPrice(value: number): string {
  return `₺${value.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
}

export function CompareDrawer() {
  const [items, setItems] = useState<CompareItem[]>([]);

  const sync = useCallback(() => {
    setItems(getCompareItems());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("compare-updated", sync);
    return () => window.removeEventListener("compare-updated", sync);
  }, [sync]);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] border-t border-gray-200 bg-white shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Karşılaştır ({items.length}/{MAX_COMPARE})
        </p>

        <div className="flex flex-1 items-center gap-3 overflow-x-auto">
          {items.map((item) => (
            <div key={item.id} className="relative flex flex-shrink-0 items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
              <Image
                src={item.image}
                alt={item.name}
                width={40}
                height={40}
                className="h-10 w-10 rounded-md object-cover"
              />
              <div className="max-w-[120px]">
                <p className="truncate text-xs font-medium text-gray-700">{item.name}</p>
                <p className="text-xs text-gray-500">{formatPrice(item.price)}</p>
              </div>
              <button
                onClick={() => removeFromCompare(item.id)}
                className="ml-1 rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                aria-label="Kaldır"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <Link
          href={`/karsilastir?ids=${items.map((i) => i.id).join(",")}`}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
            items.length >= 2
              ? "bg-[#1A1A1A] text-white hover:bg-[#333]"
              : "cursor-not-allowed bg-gray-200 text-gray-400"
          }`}
          onClick={(e) => { if (items.length < 2) e.preventDefault(); }}
        >
          Karşılaştır <ArrowRight className="h-3.5 w-3.5" />
        </Link>

        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            window.dispatchEvent(new CustomEvent("compare-updated"));
          }}
          className="text-xs text-gray-400 underline transition-colors hover:text-gray-600"
        >
          Temizle
        </button>
      </div>
    </div>
  );
}
