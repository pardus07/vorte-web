"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { ProductWithVariants } from "@/lib/types";

interface QuickViewProps {
  product: ProductWithVariants;
  trigger: React.ReactNode;
}

export function QuickView({ product, trigger }: QuickViewProps) {
  const [selectedColor, setSelectedColor] = useState(product.variants[0]?.color || "");
  const [selectedSize, setSelectedSize] = useState("");
  const [adding, setAdding] = useState(false);

  const uniqueColors = Array.from(
    new Map(product.variants.map((v) => [v.color, { color: v.color, colorHex: v.colorHex }])).values()
  );

  const availableSizes = product.variants
    .filter((v) => v.color === selectedColor && v.stock > 0)
    .map((v) => v.size);

  const selectedVariant = product.variants.find(
    (v) => v.color === selectedColor && v.size === selectedSize
  );

  const currentPrice = selectedVariant?.price || product.basePrice;

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    setAdding(true);
    try {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selectedVariant.id, quantity: 1 }),
      });
      window.dispatchEvent(new CustomEvent("cart-updated"));
    } catch {
      // hata
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[400] bg-black/40 data-[state=open]:animate-[fade-in_200ms]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[400] w-[90vw] max-w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none md:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Görsel */}
            <div className="aspect-square overflow-hidden rounded-xl bg-gray-50">
              {product.images[0] ? (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  width={400}
                  height={400}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-6xl font-light text-gray-200">V</span>
                </div>
              )}
            </div>

            {/* Bilgi */}
            <div className="flex flex-col">
              <p className="text-xs text-gray-400">{product.category.name}</p>
              <h3 className="mt-1 text-lg font-semibold text-[#1A1A1A]">{product.name}</h3>
              <p className="mt-2 text-xl font-bold text-[#1A1A1A]">{formatPrice(currentPrice)}</p>

              {/* Renk seçimi */}
              {uniqueColors.length > 1 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-gray-500">Renk: {selectedColor}</p>
                  <div className="flex gap-2">
                    {uniqueColors.map((c) => (
                      <button
                        key={c.color}
                        onClick={() => { setSelectedColor(c.color); setSelectedSize(""); }}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          selectedColor === c.color ? "border-[#1A1A1A] ring-2 ring-[#1A1A1A]/20" : "border-gray-200"
                        }`}
                        style={{ backgroundColor: c.colorHex }}
                        title={c.color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Beden seçimi */}
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-gray-500">Beden</p>
                <div className="flex flex-wrap gap-2">
                  {["S", "M", "L", "XL", "XXL"].map((size) => {
                    const available = availableSizes.includes(size);
                    return (
                      <button
                        key={size}
                        onClick={() => available && setSelectedSize(size)}
                        disabled={!available}
                        className={`rounded-lg border px-4 py-2 text-xs font-medium transition-all ${
                          selectedSize === size
                            ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                            : available
                            ? "border-gray-200 text-gray-700 hover:border-gray-400"
                            : "cursor-not-allowed border-gray-100 text-gray-300 line-through"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sepete ekle */}
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize || adding}
                className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-[#1A1A1A] py-3 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingBag className="h-4 w-4" />
                {adding ? "Ekleniyor..." : "Sepete Ekle"}
              </button>

              {/* Detay linki */}
              <Link
                href={`/urun/${product.slug}`}
                className="mt-3 text-center text-xs text-gray-400 underline transition-colors hover:text-gray-600"
              >
                Ürün Detayına Git
              </Link>
            </div>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Kapat"
            >
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
