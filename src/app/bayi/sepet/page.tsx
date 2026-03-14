"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Trash2, Minus, Plus, ShoppingCart, AlertTriangle, Factory } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const DOZEN = 12;

interface DealerLimits {
  minOrderAmount: number | null;
  minOrderQuantity: number | null;
}

interface CartItemData {
  id: string;
  quantity: number;
  isProduction?: boolean;
  product: {
    name: string;
    basePrice: number;
    images: string[];
    dealerPrices: { dealerId: string | null; wholesalePrice: number }[];
  };
  variant: {
    color: string;
    size: string;
    sku: string;
    stock: number;
  };
}

export default function DealerCartPage() {
  const [items, setItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState<DealerLimits>({ minOrderAmount: null, minOrderQuantity: null });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const router = useRouter();

  const fetchCart = () => {
    fetch("/api/dealer/cart")
      .then((r) => r.json())
      .then((data) => { setItems(data); setLoading(false); });
  };

  useEffect(() => {
    fetchCart();
    fetch("/api/dealer/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setLimits({ minOrderAmount: data.minOrderAmount, minOrderQuantity: data.minOrderQuantity });
      })
      .catch(() => {});
  }, []);

  const updateQty = async (id: string, quantity: number) => {
    // Düzine bazlı — 12'nin altına düşerse sil
    if (quantity < DOZEN) return removeItem(id);
    // 12'nin katına yuvarla
    const rounded = Math.round(quantity / DOZEN) * DOZEN;
    if (rounded < DOZEN) return removeItem(id);
    await fetch(`/api/dealer/cart/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: rounded }),
    });
    fetchCart();
  };

  const removeItem = async (id: string) => {
    await fetch(`/api/dealer/cart/${id}`, { method: "DELETE" });
    fetchCart();
  };

  const getPrice = (item: CartItemData) => {
    const dealerPrice = item.product.dealerPrices.find((p) => p.dealerId !== null);
    const generalPrice = item.product.dealerPrices.find((p) => p.dealerId === null);
    return dealerPrice?.wholesalePrice || generalPrice?.wholesalePrice || item.product.basePrice;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + getPrice(item) * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalDozens = Math.floor(totalItems / DOZEN);
  const hasProduction = items.some((item) => item.quantity > item.variant.stock);

  const belowMinAmount = limits.minOrderAmount ? total < limits.minOrderAmount : false;
  const belowMinQty = limits.minOrderQuantity ? totalItems < limits.minOrderQuantity : false;
  const canCheckout = !belowMinAmount && !belowMinQty && items.length > 0;

  const handleCheckout = async () => {
    setCheckoutError("");
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/dealer/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.checkoutFormContent) {
        // iyzico form var — ödeme sayfasına yönlendir
        const params = new URLSearchParams({
          form: encodeURIComponent(data.checkoutFormContent),
          orderNumber: data.orderNumber || "",
          total: (total || 0).toFixed(2),
        });
        router.push(`/bayi/odeme?${params.toString()}`);
      } else if (res.ok && data.orderId) {
        // Dev mode — direkt sipariş oluştu
        router.push(`/bayi/odeme/basarili?order=${data.orderId}`);
      } else {
        setCheckoutError(data.error || "Ödeme başlatılamadı");
      }
    } catch {
      setCheckoutError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShoppingCart className="h-16 w-16 text-gray-300" />
        <h2 className="mt-4 text-lg font-bold text-gray-900">Sepetiniz Boş</h2>
        <p className="mt-2 text-sm text-gray-500">Ürün kataloğundan ürün ekleyin</p>
        <Link href="/bayi/urunler" className="mt-4">
          <Button>Ürünlere Git</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Sepetim</h1>
      <p className="mt-1 text-sm text-gray-500">
        {totalDozens} düzine ({totalItems} adet)
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const price = getPrice(item);
            const itemIsProduction = item.quantity > item.variant.stock;
            const image = item.product.images?.[0];
            return (
              <div key={item.id} className={`flex gap-4 rounded-lg border bg-white p-4 ${itemIsProduction ? "border-orange-200" : "border-gray-200"}`}>
                {/* Product Image */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                  {image ? (
                    <img src={image.startsWith("/") ? image : `/images/${image}`} alt={item.product.name} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300 text-xs">Foto</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{item.product.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.variant.color} / {item.variant.size}
                      </p>
                      {itemIsProduction && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                          <Factory className="h-3 w-3" />
                          Üretim Siparişi
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    {/* Quantity — dozen based */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(item.id, item.quantity - DOZEN)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-xs hover:bg-gray-100"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <div className="text-center">
                        <span className="block text-sm font-medium w-12 text-center">{item.quantity}</span>
                        <span className="block text-[10px] text-gray-400">{item.quantity / DOZEN} düzine</span>
                      </div>
                      <button
                        onClick={() => updateQty(item.id, item.quantity + DOZEN)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-xs hover:bg-gray-100"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#7AC143]">{(price * item.quantity).toFixed(2)} ₺</p>
                      <p className="text-[10px] text-gray-400">{price.toFixed(2)} ₺/adet</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="rounded-lg border bg-white p-6 h-fit sticky top-4">
          <h2 className="text-lg font-bold text-gray-900">Sipariş Özeti</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Toplam Ürün</span>
              <span>{totalDozens} düzine ({totalItems} adet)</span>
            </div>
            {hasProduction && (
              <div className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700">
                <Factory className="h-3.5 w-3.5" />
                <span>Sepetinizde üretim siparişi bulunuyor</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-3 text-lg font-bold">
              <span>Toplam</span>
              <span className="text-[#7AC143]">{total.toFixed(2)} ₺</span>
            </div>
          </div>

          {belowMinAmount && limits.minOrderAmount && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Minimum sipariş tutarı <strong>{limits.minOrderAmount.toFixed(2)} ₺</strong>.
                {" "}{(limits.minOrderAmount - total).toFixed(2)} ₺ daha ürün ekleyin.
              </span>
            </div>
          )}

          {belowMinQty && limits.minOrderQuantity && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Minimum sipariş adedi <strong>{limits.minOrderQuantity}</strong>.
                {" "}{limits.minOrderQuantity - totalItems} adet daha ürün ekleyin.
              </span>
            </div>
          )}

          {checkoutError && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600">
              {checkoutError}
            </div>
          )}

          <Button
            className="mt-4 w-full"
            size="lg"
            disabled={!canCheckout || checkoutLoading}
            loading={checkoutLoading}
            onClick={handleCheckout}
          >
            Ödeme Yap
          </Button>
          <p className="mt-2 text-center text-xs text-gray-400">
            KDV dahil fiyatlar • İade kabul edilmez
          </p>
        </div>
      </div>
    </div>
  );
}
