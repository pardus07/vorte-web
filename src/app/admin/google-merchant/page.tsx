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
  Rss,
  BarChart3,
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

  /* Pagination page numbers */
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [1];
    if (page > 3) pages.push("ellipsis");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Google Merchant Center</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            Urun feed yonetimi ve senkronizasyon durumu
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSync()} disabled={syncing}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Tumunu Senkronize Et
          </Button>
          <a href={feedUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Feed Onizle
            </Button>
          </a>
        </div>
      </div>

      {/* Feed URL Bar */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
            <Rss className="h-5 w-5 text-violet-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">Feed URL</p>
            <code className="mt-0.5 block truncate font-mono text-sm text-gray-700">{feedUrl}</code>
          </div>
          <button
            onClick={copyFeedUrl}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-700"
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Stat Cards - 5 Column Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Products */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
              <ShoppingBag className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">Toplam Urun</p>
              <p className="text-2xl font-bold tracking-tight text-gray-900">{stats.totalProducts}</p>
            </div>
          </div>
        </div>

        {/* Synced */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">Senkronize</p>
              <p className="text-2xl font-bold tracking-tight text-emerald-600">{stats.synced}</p>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">Bekleyen</p>
              <p className="text-2xl font-bold tracking-tight text-amber-600">{stats.pending}</p>
            </div>
          </div>
        </div>

        {/* No Category */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">Kategorisiz</p>
              <p className="text-2xl font-bold tracking-tight text-red-600">{stats.noCategory}</p>
            </div>
          </div>
        </div>

        {/* Feed Variants */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">Feed Varyant</p>
              <p className="text-2xl font-bold tracking-tight text-blue-600">{stats.totalVariants}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Alert */}
      {stats.noCategory > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">Kategori Uyarisi</p>
              <p className="mt-0.5 text-[13px] text-amber-700">
                <span className="font-medium">{stats.noCategory} urun</span> icin Google Urun Kategorisi tanimlanmamis.
              </p>
            </div>
            <button
              onClick={() => {
                const uncategorized = products.filter((p) => !p.googleCategory).map((p) => p.id);
                if (uncategorized.length > 0) handleSetCategory(uncategorized, GOOGLE_UNDERWEAR_CATEGORY);
              }}
              className="shrink-0 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700"
            >
              Tumune &quot;Ic Giyim&quot; Ata
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex rounded-2xl bg-gray-100/80 p-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setFilter(opt.value); setPage(1); }}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                filter === opt.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="hidden text-[13px] text-gray-500 sm:block">
          {total} urun listeleniyor
        </p>
      </div>

      {/* Bulk Action Bar */}
      {selected.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-blue-800">{selected.length} urun secili</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => handleSync(selected)} disabled={syncing}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                Senkronize Et
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleSetCategory(selected, GOOGLE_UNDERWEAR_CATEGORY)}>
                <Tag className="mr-1.5 h-3.5 w-3.5" />
                Kategori Ata
              </Button>
            </div>
            <button
              onClick={() => setSelected([])}
              className="ml-auto text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
            >
              Secimi Temizle
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50/80">
                <tr>
                  <th className="w-12 px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selected.length === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-[#7AC143] focus:ring-[#7AC143]"
                    />
                  </th>
                  <th className="px-5 py-4 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Urun</th>
                  <th className="px-5 py-4 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Google Kategori</th>
                  <th className="px-5 py-4 text-[12px] font-semibold uppercase tracking-wider text-gray-500">GTIN</th>
                  <th className="px-5 py-4 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Varyant</th>
                  <th className="px-5 py-4 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Stok</th>
                  <th className="px-5 py-4 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Durum</th>
                  <th className="px-5 py-4 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Son Senk.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => {
                  const hasGtin = p.variants.every((v) => v.gtinBarcode);
                  const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
                  const gtinCount = p.variants.filter((v) => v.gtinBarcode).length;
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selected.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#7AC143] focus:ring-[#7AC143]"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="mt-0.5 text-[12px] text-gray-400">{p.basePrice.toFixed(2)} TRY</p>
                      </td>
                      <td className="px-5 py-4">
                        {p.googleCategory ? (
                          <span className="text-[13px] text-gray-600">{p.googleCategory}</span>
                        ) : (
                          <Badge variant="warning">Eksik</Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {hasGtin ? (
                          <span className="inline-flex items-center gap-1.5 text-[13px] text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Tamami var
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[13px] text-amber-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {gtinCount}/{p.variants.length}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-[13px] text-gray-600">{p.variants.length}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${totalStock > 0 ? "text-emerald-600" : "text-red-600"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${totalStock > 0 ? "bg-emerald-500" : "bg-red-500"}`} />
                          {totalStock}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {p.merchantSynced ? (
                          <span className="inline-flex items-center gap-1.5 text-[13px] text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Senkronize
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[13px] text-gray-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                            Bekliyor
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-[12px] text-gray-400">
                        {p.merchantSyncedAt
                          ? new Date(p.merchantSyncedAt).toLocaleDateString("tr-TR")
                          : "\u2014"}
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
                          <ShoppingBag className="h-6 w-6 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400">Urun bulunamadi</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-gray-500">
            Sayfa <span className="font-medium text-gray-700">{page}</span> / {totalPages}
            <span className="ml-2 text-gray-300">|</span>
            <span className="ml-2">{total} urun</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {getPageNumbers().map((p, idx) =>
              p === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="flex h-9 w-9 items-center justify-center text-[13px] text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                    page === p
                      ? "bg-[#1A1A1A] text-white shadow-sm"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
