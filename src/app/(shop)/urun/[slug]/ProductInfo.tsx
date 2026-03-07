"use client";

import { useState, useMemo } from "react";
import { ShoppingBag, Barcode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ColorSelector } from "@/components/product/ColorSelector";
import { SizeSelector } from "@/components/product/SizeSelector";
import { SocialShare } from "@/components/product/SocialShare";
import { FavoriteButton } from "@/components/product/FavoriteButton";
import { formatPrice } from "@/lib/utils";

interface Variant {
  id: string;
  color: string;
  colorHex: string;
  size: string;
  stock: number;
  price: number | null;
  sku: string;
  gtinBarcode: string | null;
}

interface ProductInfoProps {
  product: {
    id: string;
    name: string;
    basePrice: number;
    category: { name: string };
    variants: Variant[];
  };
  selectedColor: string;
  onColorChange: (color: string) => void;
  gender?: "erkek" | "kadın";
}

export function ProductInfo({ product, selectedColor, onColorChange, gender }: ProductInfoProps) {
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState("");

  // Unique colors with availability
  const colors = useMemo(() => {
    const colorMap = new Map<string, { color: string; colorHex: string; available: boolean }>();
    for (const v of product.variants) {
      const existing = colorMap.get(v.color);
      colorMap.set(v.color, {
        color: v.color,
        colorHex: v.colorHex,
        available: existing?.available || v.stock > 0,
      });
    }
    return Array.from(colorMap.values());
  }, [product.variants]);

  // Sizes for selected color
  const sizes = useMemo(() => {
    return product.variants
      .filter((v) => v.color === selectedColor)
      .map((v) => ({
        size: v.size,
        stock: v.stock,
        variantId: v.id,
      }));
  }, [product.variants, selectedColor]);

  // Selected variant
  const selectedVariant = useMemo(() => {
    return product.variants.find(
      (v) => v.color === selectedColor && v.size === selectedSize
    );
  }, [product.variants, selectedColor, selectedSize]);

  const price = selectedVariant?.price ?? product.basePrice;
  const isOutOfStock = selectedVariant ? selectedVariant.stock === 0 : false;

  const handleAddToCart = async () => {
    if (!selectedSize || !selectedVariant) return;
    setIsAdding(true);
    setAddError("");

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variantId: selectedVariant.id,
          quantity,
        }),
      });

      if (res.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
        window.dispatchEvent(new CustomEvent("cart-updated"));
      } else {
        const data = await res.json().catch(() => null);
        setAddError(data?.error || "Ürün sepete eklenirken bir hata oluştu.");
      }
    } catch {
      setAddError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Category & name */}
      <div>
        <p className="text-sm text-gray-500">{product.category.name}</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 lg:text-3xl">
          {product.name}
        </h1>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-gray-900">
          {formatPrice(price)}
        </span>
        {selectedVariant?.price != null && selectedVariant.price < product.basePrice && (
          <span className="text-lg text-gray-400 line-through">
            {formatPrice(product.basePrice)}
          </span>
        )}
      </div>

      {/* SKU & GTIN */}
      {selectedVariant && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
          <span>SKU: {selectedVariant.sku}</span>
          {selectedVariant.gtinBarcode && (
            <span className="flex items-center gap-1">
              <Barcode className="h-3 w-3" />
              GTIN: {selectedVariant.gtinBarcode}
            </span>
          )}
        </div>
      )}

      {/* Color selection */}
      <ColorSelector
        colors={colors}
        selectedColor={selectedColor}
        onSelect={(color) => {
          onColorChange(color);
          setSelectedSize("");
          setQuantity(1);
        }}
      />

      {/* Size selection */}
      <SizeSelector
        sizes={sizes}
        selectedSize={selectedSize}
        onSelect={setSelectedSize}
        gender={gender}
      />

      {/* Quantity */}
      {selectedSize && !isOutOfStock && (
        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">
            Adet
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex h-10 w-10 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              -
            </button>
            <span className="w-10 text-center font-medium">{quantity}</span>
            <button
              onClick={() =>
                setQuantity(
                  Math.min(selectedVariant?.stock ?? 10, quantity + 1)
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              +
            </button>
            {selectedVariant && selectedVariant.stock <= 5 && (
              <span className="text-xs text-orange-500">
                Son {selectedVariant.stock} adet!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Add to cart + Favorite */}
      <div className="flex gap-3">
        <Button
          size="lg"
          className="flex-1"
          onClick={handleAddToCart}
          disabled={!selectedSize || isOutOfStock || isAdding}
          loading={isAdding}
        >
          {added ? (
            "Sepete Eklendi ✓"
          ) : isOutOfStock ? (
            "Stokta Yok"
          ) : !selectedSize ? (
            "Beden Seçiniz"
          ) : (
            <>
              <ShoppingBag className="mr-2 h-5 w-5" />
              Sepete Ekle
            </>
          )}
        </Button>
        <FavoriteButton productId={product.id} />
      </div>

      {/* Error message */}
      {addError && (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-600">{addError}</p>
      )}

      {/* Social Share */}
      <SocialShare
        url={typeof window !== "undefined" ? window.location.href : ""}
        title={product.name}
      />

      {/* Stock indicator */}
      {selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 10 && (
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-orange-500 transition-all"
              style={{
                width: `${Math.min(100, (selectedVariant.stock / 10) * 100)}%`,
              }}
            />
          </div>
          <span className="text-xs text-orange-600">
            Stokta {selectedVariant.stock} adet kaldı
          </span>
        </div>
      )}
    </div>
  );
}
