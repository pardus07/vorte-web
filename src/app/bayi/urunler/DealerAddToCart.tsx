"use client";

import { useState } from "react";
import { ShoppingCart, Factory, AlertTriangle, Check } from "lucide-react";

const DOZEN = 12;

interface VariantInfo {
  id: string;
  size: string;
  stock: number;
}

export function DealerAddToCart({
  productId,
  variants,
  wholesalePrice,
}: {
  productId: string;
  variants: VariantInfo[];
  wholesalePrice: number;
}) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [qty, setQty] = useState(0);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  const selectedVariant = variants.find((v) => v.size === selectedSize);
  const stock = selectedVariant?.stock ?? 0;
  const isProduction = selectedSize !== null && qty > 0 && qty > stock;
  const canAdd = selectedSize !== null && qty >= DOZEN;

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    setQty(0);
    setAdded(false);
    setError("");
  };

  const adjustQty = (delta: number) => {
    const newQty = qty + delta;
    if (newQty < 0) return;
    if (newQty === 0) {
      setQty(0);
      return;
    }
    // Ensure multiple of DOZEN
    const rounded = Math.max(DOZEN, Math.round(newQty / DOZEN) * DOZEN);
    setQty(rounded);
  };

  const handleQtyInput = (val: string) => {
    const num = parseInt(val) || 0;
    if (num === 0) {
      setQty(0);
      return;
    }
    // Round to nearest dozen, minimum 12
    const rounded = Math.max(DOZEN, Math.round(num / DOZEN) * DOZEN);
    setQty(rounded);
  };

  const handleAdd = async () => {
    if (!selectedVariant || qty < DOZEN) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/dealer/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          variantId: selectedVariant.id,
          quantity: qty,
          isProduction,
        }),
      });
      if (res.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
        setQty(0);
      } else {
        const data = await res.json();
        setError(data.error || "Eklenemedi");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Size Selection */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-gray-500">Beden Seçin:</p>
        <div className="flex gap-1.5">
          {variants.map((v) => {
            const isSelected = selectedSize === v.size;
            const outOfStock = v.stock === 0;
            return (
              <button
                key={v.size}
                onClick={() => handleSizeChange(v.size)}
                className={`relative flex min-w-[40px] flex-col items-center rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? "border-[#7AC143] bg-[#7AC143]/10 text-[#7AC143] ring-1 ring-[#7AC143]"
                    : outOfStock
                    ? "border-red-200 bg-red-50 text-red-400"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <span>{v.size}</span>
                <span className={`mt-0.5 text-[10px] ${
                  outOfStock ? "text-red-400" : "text-gray-400"
                }`}>
                  {outOfStock ? "Yok" : v.stock}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantity + Action — shown only when size is selected */}
      {selectedSize && (
        <>
          {/* Stock Info */}
          <div className="flex items-center gap-1.5 text-xs">
            {stock > 0 ? (
              <>
                <span className={stock <= 24 ? "text-orange-600" : "text-green-600"}>
                  ● Stokta {stock} adet
                </span>
              </>
            ) : (
              <span className="text-red-500">● Stokta yok — üretim siparişi verilecek</span>
            )}
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustQty(-DOZEN)}
              disabled={qty <= 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
            >
              −
            </button>
            <input
              type="number"
              min={0}
              step={DOZEN}
              value={qty || ""}
              placeholder="0"
              onChange={(e) => handleQtyInput(e.target.value)}
              onBlur={(e) => handleQtyInput(e.target.value)}
              className="h-8 w-16 rounded-lg border border-gray-300 text-center text-sm font-medium focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
            />
            <button
              onClick={() => adjustQty(DOZEN)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100"
            >
              +
            </button>
            {qty > 0 && (
              <span className="text-xs text-gray-400">
                {qty / DOZEN} düzine • {(wholesalePrice * qty).toFixed(2)} ₺
              </span>
            )}
          </div>

          {/* Production Warning */}
          {isProduction && (
            <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-2.5 text-xs text-orange-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Stokta yeterli ürün yok. Bu sipariş <strong>üretim siparişi</strong> olarak işleme alınacaktır.
                Seçtiğiniz ürün üretimi üretime alındıktan sonra en geç <strong>2 iş günü</strong> içerisinde size termin bilgisi verilecektir.
              </span>
            </div>
          )}

          {/* Add Button */}
          {added ? (
            <button disabled className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 py-2.5 text-sm font-medium text-white">
              <Check className="h-4 w-4" />
              Sepete Eklendi
            </button>
          ) : isProduction ? (
            <button
              onClick={handleAdd}
              disabled={!canAdd || adding}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              <Factory className="h-4 w-4" />
              {adding ? "Ekleniyor..." : "Üretim İçin Sipariş Ver"}
            </button>
          ) : (
            <button
              onClick={handleAdd}
              disabled={!canAdd || adding}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#7AC143] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6AAF35] disabled:opacity-50"
            >
              <ShoppingCart className="h-4 w-4" />
              {adding ? "Ekleniyor..." : "Sepete Ekle"}
            </button>
          )}

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </>
      )}
    </div>
  );
}
