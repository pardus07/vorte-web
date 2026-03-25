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
  CheckCircle,
  XCircle,
  Layers,
  Wrench,
  Building2,
  BoxSelect,
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
        setError(data.error || "Kaydetme basarisiz");
      }
    } catch {
      setError("Bir hata olustu");
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

  /* ── Loading state ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
            <Calculator className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Maliyet Hesaplama</h1>
            <p className="text-[13px] text-gray-500">Urun maliyet kalemleri ve kar marji hesaplama</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
        </div>
      </div>
    );
  }

  /* ── Main render ────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
          <Calculator className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Maliyet Hesaplama</h1>
          <p className="text-[13px] text-gray-500">Urun maliyet kalemleri ve kar marji hesaplama</p>
        </div>
      </div>

      {/* ── Messages ──────────────────────────────────────────── */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
          <p className="text-sm font-medium text-green-700">{success}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <XCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* ── Main Grid ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left Column: Form ───────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* ── Product Selector Card ─────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Urun Secimi</h2>
            <div className="relative">
              <select
                value={selectedProduct}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
              >
                <option value="">Urun seciniz...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Fiyat: {formatPrice(p.basePrice)}
                    {p.costPrice ? ` | Maliyet: ${formatPrice(p.costPrice)}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* ── Cost Form Card ────────────────────────────────── */}
          {selectedProduct && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-base font-semibold text-gray-900">Maliyet Kalemleri</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Material Cost */}
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50">
                      <Layers className="h-3.5 w-3.5 text-blue-500" />
                    </span>
                    Kumas / Malzeme Maliyeti
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={materialCost}
                      onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      placeholder="0.00"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">TL/adet</span>
                  </div>
                </div>

                {/* Labor Cost */}
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50">
                      <Wrench className="h-3.5 w-3.5 text-amber-500" />
                    </span>
                    Iscilik Maliyeti
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={laborCost}
                      onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      placeholder="0.00"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">TL/adet</span>
                  </div>
                </div>

                {/* Overhead Cost */}
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-50">
                      <Building2 className="h-3.5 w-3.5 text-purple-500" />
                    </span>
                    Genel Gider Payi
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={overheadCost}
                      onChange={(e) => setOverheadCost(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      placeholder="0.00"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">TL/adet</span>
                  </div>
                </div>

                {/* Packaging Cost */}
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50">
                      <BoxSelect className="h-3.5 w-3.5 text-rose-500" />
                    </span>
                    Ambalaj Maliyeti
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={packagingCost}
                      onChange={(e) => setPackagingCost(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      placeholder="0.00"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">TL/adet</span>
                  </div>
                </div>
              </div>

              {/* ── Total Cost Display ────────────────────────── */}
              <div className="mt-5 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Toplam Birim Maliyet</span>
                  <span className="text-xl font-bold text-emerald-600">{formatPrice(totalCost)}</span>
                </div>
              </div>

              {/* ── Notes ─────────────────────────────────────── */}
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Not (Opsiyonel)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Maliyet hesabi ile ilgili not..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                />
              </div>

              {/* ── Save Button ───────────────────────────────── */}
              <div className="mt-5 flex justify-end">
                <Button onClick={handleSave} loading={saving} className="rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm">
                  <Save className="mr-2 h-4 w-4" />
                  Kaydet ve Guncelle
                </Button>
              </div>
            </div>
          )}

          {/* ── Cost History (Collapsible) ────────────────────── */}
          {selectedProduct && costHistory.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex w-full items-center justify-between p-6"
              >
                <h2 className="flex items-center gap-2.5 text-base font-semibold text-gray-900">
                  <History className="h-5 w-5 text-gray-400" />
                  Maliyet Gecmisi
                  <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-100 px-1.5 text-[11px] font-semibold text-gray-600">
                    {costHistory.length}
                  </span>
                </h2>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                    showHistory ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showHistory && (
                <div className="overflow-x-auto border-t border-gray-100">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-gray-50/80">
                      <tr>
                        <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Tarih</th>
                        <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Malzeme</th>
                        <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Iscilik</th>
                        <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Gider</th>
                        <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Ambalaj</th>
                        <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Toplam</th>
                        <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Not</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {costHistory.map((c) => (
                        <tr key={c.id} className="transition-colors hover:bg-gray-50/50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                            {new Date(c.calculatedAt).toLocaleDateString("tr-TR")}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600">{formatPrice(c.materialCost)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600">{formatPrice(c.laborCost)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600">{formatPrice(c.overheadCost)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600">{formatPrice(c.packagingCost)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatPrice(c.totalCost)}</td>
                          <td className="max-w-[160px] truncate px-4 py-3 text-xs text-gray-500">{c.notes || "\u2014"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right Column: Profit Calculator & Info ──────────── */}
        <div className="space-y-6">
          {selectedProduct && selectedProductData ? (
            <>
              {/* ── Profit Calculator Card ────────────────────── */}
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {/* Gradient header */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 px-6 py-5">
                  <h3 className="flex items-center gap-2.5 text-sm font-semibold text-white">
                    <TrendingUp className="h-4.5 w-4.5 text-emerald-400" />
                    Kar Hesabi
                  </h3>
                  <p className="mt-0.5 text-[12px] text-gray-400">Birim bazinda kar/zarar analizi</p>
                </div>

                <div className="space-y-3 p-6">
                  {/* Revenue */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Perakende Fiyat</span>
                    <span className="text-sm font-semibold text-gray-900">{formatPrice(retailPrice)}</span>
                  </div>

                  {/* Cost */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Birim Maliyet</span>
                    <span className="text-sm font-semibold text-red-500">{formatPrice(totalCost)}</span>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Profit */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Birim Kar</span>
                    <span
                      className={`text-lg font-bold ${
                        profitPerUnit >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {formatPrice(profitPerUnit)}
                    </span>
                  </div>

                  {/* Profit Margin */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Kar Marji</span>
                    <Badge
                      variant={
                        profitMargin >= 30
                          ? "success"
                          : profitMargin >= 15
                          ? "warning"
                          : "discount"
                      }
                      className="rounded-lg"
                    >
                      %{profitMargin.toFixed(1)}
                    </Badge>
                  </div>

                  {/* Visual Profit Bar */}
                  {totalCost > 0 && (
                    <div className="pt-1">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] text-gray-400">
                        <span>Maliyet</span>
                        <span>Kar Marji</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            profitMargin >= 30
                              ? "bg-emerald-500"
                              : profitMargin >= 15
                              ? "bg-amber-400"
                              : "bg-red-400"
                          }`}
                          style={{
                            width: `${Math.min(Math.max(profitMargin, 0), 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Wholesale Suggestion Card ─────────────────── */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-gray-900">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </div>
                  Toptan Fiyat Onerisi
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: "Maliyet + %25", value: suggestedWholesalePrice },
                    { label: "Maliyet + %35", value: totalCost * 1.35 },
                    { label: "Maliyet + %50", value: totalCost * 1.5 },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-lg bg-gray-50/80 px-3 py-2.5"
                    >
                      <span className="text-sm text-gray-600">{item.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{formatPrice(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Product Info Card ─────────────────────────── */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-gray-900">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                    <Package className="h-4 w-4 text-gray-500" />
                  </div>
                  Urun Bilgileri
                </h3>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-900">{selectedProductData.name}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Perakende Fiyat</span>
                      <span className="font-medium text-gray-900">{formatPrice(selectedProductData.basePrice)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Kayitli Maliyet</span>
                      <span className="font-medium text-gray-900">
                        {selectedProductData.costPrice
                          ? formatPrice(selectedProductData.costPrice)
                          : "\u2014"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ── Empty State ──────────────────────────────────── */
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <Calculator className="h-7 w-7 text-gray-300" />
              </div>
              <p className="mt-4 text-sm font-medium text-gray-500">Urun secilmedi</p>
              <p className="mt-1 text-[13px] text-gray-400">
                Maliyet hesaplamak icin soldan bir urun secin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
