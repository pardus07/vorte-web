"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { formatPrice } from "@/lib/utils";

interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    images: string[];
    category: { name: string };
  };
  variant: {
    id: string;
    color: string;
    colorHex: string;
    size: string;
    sku: string;
    stock: number;
    price: number | null;
  };
  unitPrice: number;
  totalPrice: number;
}

interface CartData {
  items: CartItem[];
  total: number;
  itemCount: number;
}

const FREE_SHIPPING_THRESHOLD = 200;

export default function CartPage() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    setUpdatingIds((prev) => new Set(prev).add(itemId));
    try {
      await fetch(`/api/cart/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      await fetchCart();
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdatingIds((prev) => new Set(prev).add(itemId));
    try {
      await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
      await fetchCart();
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#7AC143]" />
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Sepet" }]} />
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <ShoppingBag className="h-16 w-16 text-gray-300" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Sepetiniz Boş</h1>
          <p className="mt-2 text-gray-500">
            Henüz sepetinize ürün eklemediniz.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/erkek-ic-giyim">
              <Button>Erkek Koleksiyonu</Button>
            </Link>
            <Link href="/kadin-ic-giyim">
              <Button variant="outline">Kadın Koleksiyonu</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const shippingCost = cart.total >= FREE_SHIPPING_THRESHOLD ? 0 : 29.90;
  const grandTotal = cart.total + shippingCost;
  const remainingForFreeShipping = FREE_SHIPPING_THRESHOLD - cart.total;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Sepet" }]} />

      <h1 className="mt-4 text-2xl font-bold text-gray-900">
        Sepetim ({cart.itemCount} ürün)
      </h1>

      {/* Free shipping progress */}
      {remainingForFreeShipping > 0 && (
        <div className="mt-4 rounded-lg bg-green-50 p-3">
          <p className="text-sm text-green-700">
            Ücretsiz kargo için{" "}
            <strong>{formatPrice(remainingForFreeShipping)}</strong> daha ürün
            ekleyin!
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-green-200">
            <div
              className="h-full rounded-full bg-[#7AC143] transition-all"
              style={{
                width: `${Math.min(100, (cart.total / FREE_SHIPPING_THRESHOLD) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* Cart items */}
        <div className="lg:col-span-2">
          <div className="divide-y rounded-lg border">
            {cart.items.map((item) => (
              <div key={item.id} className="flex gap-4 p-4">
                {/* Image */}
                <Link
                  href={`/urun/${item.product.slug}`}
                  className="relative h-24 w-20 shrink-0 overflow-hidden rounded bg-gray-100"
                >
                  {item.product.images[0] ? (
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl font-bold text-gray-300">
                      V
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link
                      href={`/urun/${item.product.slug}`}
                      className="text-sm font-medium text-gray-900 hover:text-[#7AC143]"
                    >
                      {item.product.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span
                        className="inline-block h-3 w-3 rounded-full border"
                        style={{ backgroundColor: item.variant.colorHex }}
                      />
                      {item.variant.color} / {item.variant.size}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    {/* Quantity */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          item.quantity > 1
                            ? updateQuantity(item.id, item.quantity - 1)
                            : removeItem(item.id)
                        }
                        disabled={updatingIds.has(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {updatingIds.has(item.id) ? "..." : item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={
                          updatingIds.has(item.id) ||
                          item.quantity >= item.variant.stock
                        }
                        className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Price & Remove */}
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-gray-900">
                        {formatPrice(item.totalPrice)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={updatingIds.has(item.id)}
                        className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="rounded-lg border p-6">
            <h2 className="text-lg font-bold text-gray-900">Sipariş Özeti</h2>

            {/* Coupon */}
            <div className="mt-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError("");
                    }}
                    placeholder="Kupon Kodu"
                    className="w-full rounded border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!couponCode) return;
                    setCouponError("Geçersiz kupon kodu");
                  }}
                >
                  Uygula
                </Button>
              </div>
              {couponError && (
                <p className="mt-1 text-xs text-red-500">{couponError}</p>
              )}
            </div>

            <div className="mt-4 space-y-3 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ara Toplam</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Kargo</span>
                <span className={shippingCost === 0 ? "text-[#7AC143] font-medium" : ""}>
                  {shippingCost === 0 ? "Ücretsiz" : formatPrice(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Toplam</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>
            </div>

            <Link href="/odeme" className="mt-4 block">
              <Button className="w-full" size="lg">
                Ödemeye Geç
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <p className="mt-3 text-center text-xs text-gray-400">
              KDV dahil fiyatlar
            </p>
          </div>

          {/* Trust badges */}
          <div className="mt-4 space-y-2 text-center text-xs text-gray-500">
            <p>🔒 256-bit SSL ile güvenli ödeme</p>
            <p>🚚 1-3 iş günü teslimat</p>
            <p>↩️ 14 gün koşulsuz iade</p>
          </div>
        </div>
      </div>
    </div>
  );
}
