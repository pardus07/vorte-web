"use client";

import Link from "next/link";
import { Heart, Eye, GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { ProductWithVariants } from "@/lib/types";
import { QuickView } from "./QuickView";
import { addToCompare, isInCompare } from "./CompareDrawer";

interface ProductCardProps {
  product: ProductWithVariants;
}

function getFavorites(): string[] {
  try {
    const stored = localStorage.getItem("favorites");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageError, setImageError] = useState(false);

  const checkFavorite = useCallback(() => {
    const favorites = getFavorites();
    setIsFavorite(favorites.includes(product.id));
  }, [product.id]);

  useEffect(() => {
    checkFavorite();

    const handleFavoritesChange = () => {
      checkFavorite();
    };

    window.addEventListener("favorites-updated", handleFavoritesChange);
    return () => {
      window.removeEventListener("favorites-updated", handleFavoritesChange);
    };
  }, [checkFavorite]);

  const uniqueColors = Array.from(
    new Map(
      product.variants.map((v) => [v.color, { color: v.color, colorHex: v.colorHex }])
    ).values()
  );

  const lowestPrice = Math.min(
    product.basePrice,
    ...product.variants.filter((v) => v.price != null).map((v) => v.price!)
  );

  const hasDiscount = lowestPrice < product.basePrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.basePrice - lowestPrice) / product.basePrice) * 100)
    : 0;

  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const isOutOfStock = totalStock === 0;

  return (
    <div className="group relative">
      {/* Image */}
      <Link href={`/urun/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-100">
          {product.images[0] && !imageError ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-200">
              <span className="text-4xl font-bold text-gray-300">V</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {product.featured && <Badge variant="new">YENİ</Badge>}
            {hasDiscount && <Badge variant="discount">%{discountPercent}</Badge>}
            {isOutOfStock && <Badge variant="outline">Tükendi</Badge>}
          </div>

          {/* Action buttons */}
          <div className="absolute right-2 top-2 flex flex-col gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100">
            {/* Favori */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const favorites = getFavorites();
                let updated: string[];
                if (favorites.includes(product.id)) {
                  updated = favorites.filter((id) => id !== product.id);
                } else {
                  updated = [...favorites, product.id];
                }
                localStorage.setItem("favorites", JSON.stringify(updated));
                setIsFavorite(!isFavorite);
                window.dispatchEvent(new CustomEvent("favorites-updated"));
              }}
              className="rounded-full bg-white/80 p-2 backdrop-blur-sm transition-all hover:bg-white"
              aria-label="Favorilere ekle"
            >
              <Heart
                className={`h-4 w-4 ${
                  isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"
                }`}
              />
            </button>

            {/* Karşılaştır */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCompare({
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  image: product.images[0] || "",
                  price: lowestPrice,
                });
              }}
              className="rounded-full bg-white/80 p-2 backdrop-blur-sm transition-all hover:bg-white"
              aria-label="Karşılaştırmaya ekle"
            >
              <GitCompareArrows className={`h-4 w-4 ${isInCompare(product.id) ? "text-[#7AC143]" : "text-gray-600"}`} />
            </button>
          </div>

          {/* QuickView */}
          <div className="absolute bottom-2 left-2 right-2 opacity-0 transition-opacity md:group-hover:opacity-100">
            <QuickView
              product={product}
              trigger={
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/90 py-2 text-xs font-medium text-[#1A1A1A] backdrop-blur-sm transition-all hover:bg-white"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Hızlı Bak
                </button>
              }
            />
          </div>

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="rounded bg-white px-3 py-1 text-sm font-medium text-gray-800">
                Stokta Yok
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="mt-3 space-y-1">
        <p className="text-xs text-gray-500">{product.category.name}</p>
        <Link href={`/urun/${product.slug}`}>
          <h3 className="text-sm font-medium text-gray-900 transition-colors hover:text-[#7AC143] line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Color swatches */}
        {uniqueColors.length > 1 && (
          <div className="flex gap-1">
            {uniqueColors.map((c) => (
              <span
                key={c.color}
                className="h-3 w-3 rounded-full border border-gray-300"
                style={{ backgroundColor: c.colorHex }}
                title={c.color}
              />
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">
            {formatPrice(lowestPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.basePrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
