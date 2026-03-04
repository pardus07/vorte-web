"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShoppingBag,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Copy,
  RefreshCw,
  Tag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const GOOGLE_UNDERWEAR_CATEGORY = "Giyim ve Aksesuar > Giyim > İç Giyim";

const FILTER_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "synced", label: "Senkronize" },
  { value: "pending", label: "Bekleyen" },
  { value: "no-category", label: "Kategorisiz" },
  { value: "no-gtin", label: "GTIN Eksik" },
];

interface ProductMerchant {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  googleCategory: string | null;
  merchantSynced: boolean;
  merchantSyncedAt: string | null;
  images: string[];
  variants: {
    id: string;
    sku: string;
    color: string;
    size: string;
    gtinBarcode: string | null;
    stock: number;
  }[];
}

interface Stats {
  totalProducts: number;
  synced: number;
  pending: number;
  noCategory: number;
  noGtin: number;
  totalVariants: number;
}

export default function GoogleMerchantPage() {
  const [products, setProducts] = useState<ProductMerchant[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, synced: 0, pending: 0, noCategory: 0, noGtin: 0, totalVariants: 0 });
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const limit = 20;
  const feedUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/feeds/google-merchant`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filter) params.set("filter", filter);

    try {
      const res = await fetch(`/api/admin/merchant?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setStats(data.stats || { totalProducts: 0, synced: 0, pending: 0, noCategory: 0, noGtin: 0, totalVariants: 0 });
    } catch { /* silent */ }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async (ids?: string[]) => {
    setSyncing(true);
    try {
      await fetch("/api/admin/merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", productIds: ids || [] }),
      });
      await fetchData();
      setSelected([]);
    } catch { /* silent */ }
    setSyncing(false);
  };

  const handleSetCategory = async (ids: string[], category: string) => {
    try {
      await fetch("/api/admin/merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-category", productIds: ids, googleCategory: category }),
      });
      await fetchData();
    } catch { /* silent */ }
  };

  const copyFeedUrl = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selected.length === products.length) {
      setSelected([]);
    } else {
      setSelected(products.map((p) => p.id));
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Google Merchant Center</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ürün feed yönetimi ve senkronizasyon
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSync()} disabled={syncing}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Tümünü Senkronize Et
          </Button>
          <a href={feedUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1.5 h-4 w-4" /> Feed Önizle
            </Button>
          </a>
        </div>
      </div>

      {/* Feed URL */}
      <div className="mt-4 flex items-center gap-2 rounded-lg border bg-gray-50 p-3">
        <Tag className="h-4 w-4 text-gray-400 shrink-0" />
        <code className="flex-1 text-sm text-gray-600 truncate">{feedUrl}</code>
        <button
          onClick={copyFeedUrl}
          className="shrink-0 rounded border px-2 py-1 text-xs text-gray-500 hover:bg-white"
        >
          {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-5">
        <div className="rounded-lg border bg-white p-4 text-center">
          <ShoppingBag className="mx-auto h-6 w-6 text-gray-400" />
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
          <p className="text-sm text-gray-500">Toplam Ürün</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <CheckCircle className="mx-auto h-6 w-6 text-green-500" />
          <p className="mt-2 text-2xl font-bold text-green-600">{stats.synced}</p>
          <p className="text-sm text-gray-500">Senkronize</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <Clock className="mx-auto h-6 w-6 text-amber-500" />
          <p className="mt-2 text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-sm text-gray-500">Bekleyen</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-2xl font-bold text-red-600">{stats.noCategory}</p>
          <p className="text-sm text-gray-500">Kategorisiz</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <Tag className="mx-auto h-6 w-6 text-blue-500" />
          <p className="mt-2 text-2xl font-bold text-blue-600">{stats.totalVariants}</p>
          <p className="text-sm text-gray-500">Feed Varyant</p>
        </div>
      </div>

      {/* Warnings */}
      {stats.noCategory > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-medium">{stats.noCategory} ürün</span> için Google Ürün Kategorisi tanımlanmamış.
          </p>
          <button
            onClick={() => {
              const uncategorized = products.filter((p) => !p.googleCategory).map((p) => p.id);
              if (uncategorized.length > 0) handleSetCategory(uncategorized, GOOGLE_UNDERWEAR_CATEGORY);
            }}
            className="ml-auto text-sm font-medium text-amber-700 hover:text-amber-900 shrink-0"
          >
            Tümüne &quot;İç Giyim&quot; Ata →
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setFilter(opt.value); setPage(1); }}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              filter === opt.value
                ? "border-[#7AC143] bg-[#7AC143]/10 font-medium text-[#7AC143]"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border bg-blue-50 p-3">
          <span className="text-sm font-medium text-blue-700">{selected.length} ürün seçili</span>
          <Button size="sm" variant="outline" onClick={() => handleSync(selected)} disabled={syncing}>
            Senkronize Et
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleSetCategory(selected, GOOGLE_UNDERWEAR_CATEGORY)}>
            Kategori Ata
          </Button>
          <button onClick={() => setSelected([])} className="ml-auto text-sm text-blue-600 hover:text-blue-800">Seçimi Temizle</button>
        </div>
      )}

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3">
                  <input type="checkbox" checked={selected.length === products.length && products.length > 0} onChange={toggleSelectAll} className="rounded" />
                </th>
                <th className="px-4 py-3 font-medium text-gray-700">Ürün</th>
                <th className="px-4 py-3 font-medium text-gray-700">Google Kategori</th>
                <th className="px-4 py-3 font-medium text-gray-700">GTIN</th>
                <th className="px-4 py-3 font-medium text-gray-700">Varyant</th>
                <th className="px-4 py-3 font-medium text-gray-700">Stok</th>
                <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                <th className="px-4 py-3 font-medium text-gray-700">Son Senk.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => {
                const hasGtin = p.variants.every((v) => v.gtinBarcode);
                const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.basePrice.toFixed(2)} TRY</p>
                    </td>
                    <td className="px-4 py-3">
                      {p.googleCategory ? (
                        <span className="text-xs text-gray-600">{p.googleCategory}</span>
                      ) : (
                        <Badge variant="warning">Eksik</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasGtin ? (
                        <Badge variant="success">Tamamı var</Badge>
                      ) : (
                        <Badge variant="warning">{p.variants.filter((v) => v.gtinBarcode).length}/{p.variants.length}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.variants.length}</td>
                    <td className="px-4 py-3">
                      <span className={totalStock > 0 ? "text-green-600" : "text-red-600"}>
                        {totalStock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.merchantSynced ? (
                        <Badge variant="success">Senkronize</Badge>
                      ) : (
                        <Badge variant="outline">Bekliyor</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.merchantSyncedAt
                        ? new Date(p.merchantSyncedAt).toLocaleDateString("tr-TR")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Ürün bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">Sayfa {page} / {totalPages}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="rounded-lg border p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="rounded-lg border p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
