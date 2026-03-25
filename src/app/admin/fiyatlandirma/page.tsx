"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Save, DollarSign, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface Product {
  id: string;
  name: string;
  basePrice: number;
}

interface Dealer {
  id: string;
  companyName: string;
  dealerCode: string;
}

interface DealerPrice {
  id: string;
  productId: string;
  dealerId: string | null;
  wholesalePrice: number;
  minQuantity: number;
}

export default function AdminPricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [prices, setPrices] = useState<DealerPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetch("/api/admin/pricing")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setDealers(data.dealers || []);
        setPrices(data.prices || []);
        setLoading(false);
      });
  }, []);

  const getPrice = (productId: string, dealerId: string | null) => {
    return prices.find((p) => p.productId === productId && p.dealerId === dealerId);
  };

  const updatePrice = (productId: string, dealerId: string | null, value: string) => {
    setHasChanges(true);
    setSaved(false);
    const existing = prices.find((p) => p.productId === productId && p.dealerId === dealerId);
    if (existing) {
      setPrices(prices.map((p) =>
        p.productId === productId && p.dealerId === dealerId
          ? { ...p, wholesalePrice: parseFloat(value) || 0 }
          : p
      ));
    } else {
      setPrices([...prices, {
        id: `new-${productId}-${dealerId}`,
        productId,
        dealerId,
        wholesalePrice: parseFloat(value) || 0,
        minQuantity: 1,
      }]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices: prices.filter((p) => p.wholesalePrice > 0) }),
      });
      setSaved(true);
      setHasChanges(false);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Calculate discount percentages
  const getDiscountPercent = (basePrice: number, wholesalePrice: number) => {
    if (!wholesalePrice || wholesalePrice >= basePrice) return null;
    return Math.round(((basePrice - wholesalePrice) / basePrice) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Fiyatlandırma</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            {products.length} ürün · {dealers.length} bayi — Toptan fiyat matrisi
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="flex items-center gap-1.5 text-[12px] text-amber-600">
              <AlertCircle className="h-3.5 w-3.5" />
              Kaydedilmemiş değişiklikler
            </span>
          )}
          {saved && (
            <span className="flex items-center gap-1.5 text-[12px] text-green-600">
              <CheckCircle className="h-3.5 w-3.5" />
              Kaydedildi
            </span>
          )}
          <Button onClick={handleSave} loading={saving} disabled={!hasChanges && !saving}>
            <Save className="mr-2 h-4 w-4" />
            Kaydet
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <div className="text-[13px] text-blue-700">
          <p className="font-medium">Toptan fiyat matrisi</p>
          <p className="mt-0.5 text-blue-600">
            &quot;Genel Toptan&quot; tüm bayiler için geçerlidir. Bayiye özel fiyat girildiğinde genel fiyat yerine bayiye özel fiyat uygulanır.
          </p>
        </div>
      </div>

      {/* Price Matrix Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50/80">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50/80 px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  Ürün
                </div>
              </th>
              <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Perakende
              </th>
              <th className="px-4 py-3.5">
                <Badge variant="new" className="text-[10px]">Genel Toptan</Badge>
              </th>
              {dealers.map((d) => (
                <th key={d.id} className="px-4 py-3.5 text-left">
                  <span className="block text-[12px] font-semibold text-gray-700">{d.companyName}</span>
                  <span className="block font-mono text-[10px] font-normal text-gray-400">{d.dealerCode}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((product, idx) => {
              const generalPrice = getPrice(product.id, null);
              const generalDiscount = generalPrice ? getDiscountPercent(product.basePrice, generalPrice.wholesalePrice) : null;
              return (
                <tr key={product.id} className={`transition-colors hover:bg-gray-50/50 ${idx % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                  <td className="sticky left-0 z-10 bg-white px-5 py-3.5">
                    <p className="font-medium text-gray-900">{product.name}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[13px] font-semibold text-gray-700">
                      ₺{product.basePrice.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={generalPrice?.wholesalePrice || ""}
                        onChange={(e) => updatePrice(product.id, null, e.target.value)}
                        className="w-24 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                        placeholder="—"
                      />
                      {generalDiscount && (
                        <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                          -%{generalDiscount}
                        </span>
                      )}
                    </div>
                  </td>
                  {dealers.map((d) => {
                    const dp = getPrice(product.id, d.id);
                    const disc = dp ? getDiscountPercent(product.basePrice, dp.wholesalePrice) : null;
                    return (
                      <td key={d.id} className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={dp?.wholesalePrice || ""}
                            onChange={(e) => updatePrice(product.id, d.id, e.target.value)}
                            className="w-24 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                            placeholder="Genel"
                          />
                          {disc && (
                            <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                              -%{disc}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
