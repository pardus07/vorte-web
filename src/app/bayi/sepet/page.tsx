"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Trash2, Minus, Plus, ShoppingCart, AlertTriangle, Factory,
  Package, ChevronDown, ChevronUp, PlusCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STAND_PACKAGES } from "@/lib/stand-packages";

const DOZEN = 12;

interface DealerLimits {
  minOrderAmount: number | null;
  minOrderQuantity: number | null;
}

interface CartItemData {
  id: string;
  quantity: number;
  standPackageId: string | null;
  standPackageType: string | null;
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

// Stand paketi grubu
interface StandGroup {
  standPackageId: string;
  standPackageType: string;
  items: CartItemData[];
  totalItems: number;
  totalPrice: number;
}

export default function DealerCartPage() {
  const [items, setItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState<DealerLimits>({ minOrderAmount: null, minOrderQuantity: null });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [expandedStands, setExpandedStands] = useState<Set<string>>(new Set());
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

  // Tekil ürünler (stand paketine AİT DEĞİL)
  const regularItems = items.filter((i) => !i.standPackageId);

  // Stand paketleri grupla
  const standGroups: StandGroup[] = [];
  const standMap = new Map<string, CartItemData[]>();
  for (const item of items) {
    if (item.standPackageId) {
      const arr = standMap.get(item.standPackageId) || [];
      arr.push(item);
      standMap.set(item.standPackageId, arr);
    }
  }
  for (const [standPackageId, standItems] of standMap) {
    const standPackageType = standItems[0]?.standPackageType || "A";
    standGroups.push({
      standPackageId,
      standPackageType,
      items: standItems,
      totalItems: standItems.reduce((s, i) => s + i.quantity, 0),
      totalPrice: standItems.reduce((s, i) => s + getPrice(i) * i.quantity, 0),
    });
  }

  function getPrice(item: CartItemData) {
    const dealerPrice = item.product.dealerPrices.find((p) => p.dealerId !== null);
    const generalPrice = item.product.dealerPrices.find((p) => p.dealerId === null);
    return dealerPrice?.wholesalePrice || generalPrice?.wholesalePrice || item.product.basePrice;
  }

  const updateQty = async (id: string, quantity: number) => {
    if (quantity < DOZEN) return removeItem(id);
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

  const removeStandPackage = async (standPackageId: string) => {
    await fetch("/api/dealer/cart/stand-package", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ standPackageId }),
    });
    fetchCart();
  };

  const addAnotherStand = async (packageType: string) => {
    await fetch("/api/dealer/cart/stand-package", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId: packageType }),
    });
    fetchCart();
  };

  const toggleStandDetails = (standPackageId: string) => {
    setExpandedStands((prev) => {
      const next = new Set(prev);
      if (next.has(standPackageId)) next.delete(standPackageId);
      else next.add(standPackageId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  const regularTotal = regularItems.reduce((sum, item) => sum + getPrice(item) * item.quantity, 0);
  const standTotal = standGroups.reduce((sum, g) => sum + g.totalPrice, 0);
  const total = regularTotal + standTotal;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const regularItemsCount = regularItems.reduce((sum, i) => sum + i.quantity, 0);
  const regularDozens = Math.floor(regularItemsCount / DOZEN);
  const hasProduction = regularItems.some((item) => item.quantity > item.variant.stock);

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
        const params = new URLSearchParams({
          form: encodeURIComponent(data.checkoutFormContent),
          orderNumber: data.orderNumber || "",
          total: (total || 0).toFixed(2),
        });
        router.push(`/bayi/odeme?${params.toString()}`);
      } else if (res.ok && data.orderId) {
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

  // Stand paket bilgisi al
  const getStandInfo = (type: string) => {
    return STAND_PACKAGES.find((p) => p.id === type);
  };

  // Stand paket accent rengi
  const standAccent: Record<string, { border: string; bg: string; badge: string }> = {
    A: { border: "border-emerald-200", bg: "bg-emerald-50", badge: "bg-emerald-500" },
    B: { border: "border-blue-200", bg: "bg-blue-50", badge: "bg-blue-500" },
    C: { border: "border-purple-200", bg: "bg-purple-50", badge: "bg-purple-500" },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Sepetim</h1>
      <p className="mt-1 text-sm text-gray-500">
        {totalItems} adet
        {standGroups.length > 0 && ` (${standGroups.length} stand paketi)`}
        {regularItemsCount > 0 && ` • ${regularDozens} düzine tekil ürün`}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {/* ====== STAND PAKETLERİ ====== */}
          {standGroups.map((group) => {
            const info = getStandInfo(group.standPackageType);
            const accent = standAccent[group.standPackageType] || standAccent.A;
            const isExpanded = expandedStands.has(group.standPackageId);

            return (
              <div
                key={group.standPackageId}
                className={`overflow-hidden rounded-lg border-2 ${accent.border} bg-white`}
              >
                {/* Stand header — tek satır */}
                <div className={`flex items-center justify-between ${accent.bg} px-4 py-3`}>
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full ${accent.badge} px-2 py-0.5 text-xs font-bold text-white`}>
                          {info?.name || `Stand ${group.standPackageType}`}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {info?.subtitle || "Paket"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {group.totalItems} adet • Karton stand dahil
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[#7AC143]">
                      {group.totalPrice.toFixed(2)} ₺
                    </span>
                  </div>
                </div>

                {/* Detay toggle + aksiyonlar */}
                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
                  <button
                    onClick={() => toggleStandDetails(group.standPackageId)}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {isExpanded ? "İçeriği Gizle" : "İçeriği Göster"}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addAnotherStand(group.standPackageType)}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Bir Tane Daha Ekle
                    </button>
                    <button
                      onClick={() => removeStandPackage(group.standPackageId)}
                      className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Paketi Kaldır
                    </button>
                  </div>
                </div>

                {/* Genişletilmiş içerik */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-1">
                    {group.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700">{item.product.name}</span>
                          <span className="text-gray-400">/ {item.variant.size}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">{item.quantity} ad.</span>
                          <span className="font-medium text-gray-900">{(getPrice(item) * item.quantity).toFixed(2)} ₺</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* ====== TEKİL ÜRÜNLER ====== */}
          {regularItems.length > 0 && standGroups.length > 0 && (
            <div className="mt-2 mb-1">
              <h3 className="text-sm font-medium text-gray-500">Tekil Ürünler</h3>
            </div>
          )}

          {regularItems.map((item) => {
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
            {standGroups.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Stand Paketleri</span>
                <span>{standGroups.length} paket</span>
              </div>
            )}
            {regularItemsCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tekil Ürünler</span>
                <span>{regularDozens} düzine ({regularItemsCount} adet)</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Toplam Ürün</span>
              <span className="font-medium">{totalItems} adet</span>
            </div>

            {standGroups.length > 0 && (
              <div className="space-y-1 rounded-lg bg-gray-50 p-2.5">
                {standGroups.map((g) => {
                  const info = getStandInfo(g.standPackageType);
                  return (
                    <div key={g.standPackageId} className="flex justify-between text-xs">
                      <span className="text-gray-500">{info?.name} — {info?.subtitle}</span>
                      <span>{g.totalPrice.toFixed(2)} ₺</span>
                    </div>
                  );
                })}
                {regularTotal > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Tekil ürünler</span>
                    <span>{regularTotal.toFixed(2)} ₺</span>
                  </div>
                )}
              </div>
            )}

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
