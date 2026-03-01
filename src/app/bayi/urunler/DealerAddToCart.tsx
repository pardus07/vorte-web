"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export function DealerAddToCart({
  productId,
  variantId,
  maxStock,
}: {
  productId: string;
  variantId: string;
  maxStock: number;
}) {
  const [qty, setQty] = useState(0);
  const [adding, setAdding] = useState(false);

  if (maxStock === 0) {
    return <span className="text-xs text-red-500">Tükendi</span>;
  }

  const handleAdd = async () => {
    if (qty <= 0) return;
    setAdding(true);
    try {
      await fetch("/api/dealer/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId, quantity: qty }),
      });
      setQty(0);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={maxStock}
        value={qty}
        onChange={(e) => setQty(Math.min(parseInt(e.target.value) || 0, maxStock))}
        className="w-14 rounded border px-2 py-1 text-center text-sm focus:border-[#7AC143] focus:outline-none"
      />
      <button
        onClick={handleAdd}
        disabled={qty <= 0 || adding}
        className="rounded bg-[#7AC143] p-1 text-white transition-colors hover:bg-[#6AAF35] disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
