"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calculator,
  Save,
  History,
  TrendingUp,
  DollarSign,
  Package,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface ProductWithCost {
  id: string;
  name: string;
  basePrice: number;
  costPrice: number | null;
  productCosts: {
    id: string;
    materialCost: number;
    laborCost: number;
    overheadCost: number;
    packagingCost: number;
    totalCost: number;
    notes: string | null;
    calculatedAt: string;
  }[];
}

interface CostHistory {
  id: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  packagingCost: number;
  totalCost: number;
  notes: string | null;
  calculatedAt: string;
}

export default function AdminCostPage() {
  const [products, setProducts] = useState<ProductWithCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [costHistory, setCostHistory] = useState<CostHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Form fields
  const [materialCost, setMaterialCost] = useState(0);
  const [laborCost, setLaborCost] = useState(0);
  const [overheadCost, setOverheadCost] = useState(0);
  const [packagingCost, setPackagingCost] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const totalCost = materialCost + laborCost + overheadCost + packagingCost;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/costs");
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleProductSelect = async (productId: string) => {
    setSelectedProduct(productId);
    setShowHistory(false);

    if (!productId) {
      setMaterialCost(0);
      setLaborCost(0);
      setOverheadCost(0);
      setPackagingCost(0);
      setNotes("");
      setCostHistory([]);
      return;
    }

    // Load existing cost data
    const product = products.find((p) => p.id === productId);
    if (product?.productCosts?.[0]) {
      const c = product.productCosts[0];
      setMaterialCost(c.materialCost);
      setLaborCost(c.laborCost);
      setOverheadCost(c.overheadCost);
      setPackagingCost(c.packagingCost);
      setNotes(c.notes || "");
    } else {
      setMaterialCost(0);
      setLaborCost(0);
      setOverheadCost(0);
      setPackagingCost(0);
      setNotes("");
    }

    // Fetch cost history
    try {
      const res = await fetch(`/api/admin/costs?productId=${productId}`);
      const data = await res.json();
      setCostHistory(data.costs || []);
    } catch {
      // silent
    }
  };

  const handleSave = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct,
          materialCost,
          laborCost,
          overheadCost,
          packagingCost,
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        setSuccess("Maliyet bilgisi kaydedildi");
        fetchProducts();
        // Refresh history
        const histRes = await fetch(`/api/admin/costs?productId=${selectedProduct}`);
        const histData = await histRes.json();
        setCostHistory(histData.costs || []);
      } else {
        const data = await res.json();
        setError(data.error || "Kaydetme başarısız");
      }
    } catch {
      setError("Bir hata oluştu");
    }
    setSaving(false);
    setTimeout(() => { setSuccess(""); setError(""); }, 4000);
  };

  const selectedProductData = products.find((p) => p.id === selectedProduct);
  const retailPrice = selectedProductData?.basePrice || 0;
  const profitPerUnit = retailPrice - totalCost;
  const profitMargin = retailPrice > 0 ? (profitPerUnit / retailPrice) * 100 : 0;
  const suggestedWholesalePrice = totalCost > 0 ? totalCost * 1.25 : 0; // %25 markup

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Maliyet Hesaplama</h1>
        <div className="mt-12 flex justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Calculator className="h-7 w-7 text-[#7AC143]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maliyet Hesaplama</h1>
          <p className="text-sm text-gray-500">Ürün maliyet kalemleri ve kâr marjı hesaplama</p>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Selector */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Ürün Seçimi</h2>
            <div className="relative">
              <select
                value={selectedProduct}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none appearance-none"
              >
                <option value="">Ürün seçiniz...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Fiyat: {formatPrice(p.basePrice)}
                    {p.costPrice ? ` | Maliyet: ${formatPrice(p.costPrice)}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Cost Form */}
          {selectedProduct && (
            <div className="rounded-lg border bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-gray-900">Maliyet Kalemleri</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Kumaş / Malzeme Maliyeti (₺/adet)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={materialCost}
                    onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    İşçilik Maliyeti (₺/adet)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={laborCost}
                    onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Genel Gider Payı (₺/adet)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={overheadCost}
                    onChange={(e) => setOverheadCost(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Ambalaj Maliyeti (₺/adet)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
                  />
                </div>
              </div>

              {/* Total */}
              <div className="mt-4 rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between text-lg font-bold text-gray-900">
                  <span>Toplam Maliyet (adet)</span>
                  <span className="text-[#7AC143]">{formatPrice(totalCost)}</span>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Not (Opsiyonel)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Maliyet hesabı ile ilgili not"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={handleSave} loading={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  Kaydet ve Güncelle
                </Button>
              </div>
            </div>
          )}

          {/* Cost History */}
          {selectedProduct && costHistory.length > 0 && (
            <div className="rounded-lg border bg-white p-6">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex w-full items-center justify-between"
              >
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <History className="h-5 w-5 text-gray-400" />
                  Maliyet Geçmişi ({costHistory.length})
                </h2>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showHistory ? "rotate-180" : ""}`} />
              </button>
              {showHistory && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 font-medium text-gray-700">Tarih</th>
                        <th className="px-3 py-2 font-medium text-gray-700 text-right">Malzeme</th>
                        <th className="px-3 py-2 font-medium text-gray-700 text-right">İşçilik</th>
                        <th className="px-3 py-2 font-medium text-gray-700 text-right">Gider</th>
                        <th className="px-3 py-2 font-medium text-gray-700 text-right">Ambalaj</th>
                        <th className="px-3 py-2 font-medium text-gray-700 text-right">Toplam</th>
                        <th className="px-3 py-2 font-medium text-gray-700">Not</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {costHistory.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-600">
                            {new Date(c.calculatedAt).toLocaleDateString("tr-TR")}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatPrice(c.materialCost)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatPrice(c.laborCost)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatPrice(c.overheadCost)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatPrice(c.packagingCost)}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">{formatPrice(c.totalCost)}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{c.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Profit Calculator */}
        <div className="space-y-6">
          {selectedProduct && selectedProductData && (
            <>
              {/* Profit Card */}
              <div className="rounded-lg border bg-white p-6">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
                  <TrendingUp className="h-5 w-5 text-[#7AC143]" />
                  Kâr Hesabı
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Perakende Fiyat</span>
                    <span className="font-medium">{formatPrice(retailPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Birim Maliyet</span>
                    <span className="font-medium text-red-600">{formatPrice(totalCost)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-base font-bold">
                      <span>Birim Kâr</span>
                      <span className={profitPerUnit >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatPrice(profitPerUnit)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Kâr Marjı</span>
                    <Badge variant={profitMargin >= 30 ? "success" : profitMargin >= 15 ? "warning" : "discount"}>
                      %{profitMargin.toFixed(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Wholesale Suggestion */}
              <div className="rounded-lg border bg-white p-6">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                  Toptan Fiyat Önerisi
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Maliyet + %25</span>
                    <span className="font-medium">{formatPrice(suggestedWholesalePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Maliyet + %35</span>
                    <span className="font-medium">{formatPrice(totalCost * 1.35)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Maliyet + %50</span>
                    <span className="font-medium">{formatPrice(totalCost * 1.5)}</span>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="rounded-lg border bg-white p-6">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
                  <Package className="h-5 w-5 text-gray-400" />
                  Ürün Bilgileri
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong className="text-gray-900">{selectedProductData.name}</strong></p>
                  <div className="flex justify-between">
                    <span>Perakende Fiyat</span>
                    <span className="font-medium">{formatPrice(selectedProductData.basePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kayıtlı Maliyet</span>
                    <span className="font-medium">
                      {selectedProductData.costPrice ? formatPrice(selectedProductData.costPrice) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {!selectedProduct && (
            <div className="rounded-lg border bg-white p-6 text-center">
              <Calculator className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-gray-500">Maliyet hesaplamak için bir ürün seçin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
