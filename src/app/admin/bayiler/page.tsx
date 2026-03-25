"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Building2,
  CheckCircle,
  Clock,
  Ban,
  Plus,
  Eye,
  Phone,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATUS_OPTIONS = [
  { value: "", label: "Tümü", icon: Filter },
  { value: "PENDING", label: "Bekleyen", icon: Clock },
  { value: "ACTIVE", label: "Aktif", icon: CheckCircle },
  { value: "SUSPENDED", label: "Askıda", icon: Ban },
];

const TIER_BADGES: Record<string, { label: string; className: string }> = {
  standard: { label: "Standard", className: "bg-gray-100 text-gray-700" },
  silver: { label: "Silver", className: "bg-gray-200 text-gray-800" },
  gold: { label: "Gold", className: "bg-amber-100 text-amber-800" },
  platinum: { label: "Platinum", className: "bg-purple-100 text-purple-800" },
};

const STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "discount" }> = {
  ACTIVE: { label: "Aktif", variant: "success" },
  PENDING: { label: "Bekliyor", variant: "warning" },
  SUSPENDED: { label: "Askıda", variant: "discount" },
};

interface DealerData {
  id: string;
  companyName: string;
  taxNumber: string;
  dealerCode: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  dealerTier: string;
  discountRate: number | null;
  creditLimit: number | null;
  creditBalance: number;
  status: string;
  approvedAt: string | null;
  createdAt: string;
  _count: { orders: number };
  totalRevenue: number;
  paidOrderCount: number;
}

export default function AdminDealersPage() {
  const [dealers, setDealers] = useState<DealerData[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [tier, setTier] = useState("");
  const [sort, setSort] = useState("newest");

  const limit = 20;

  const fetchDealers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (tier) params.set("tier", tier);
    if (sort !== "newest") params.set("sort", sort);

    try {
      const res = await fetch(`/api/admin/dealers?${params}`);
      const data = await res.json();
      setDealers(data.dealers || []);
      setTotal(data.total || 0);
      setStatusCounts(data.statusCounts || {});
    } catch {
      // silent
    }
    setLoading(false);
  }, [page, search, status, tier, sort]);

  useEffect(() => {
    fetchDealers();
  }, [fetchDealers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDealers();
  };

  const totalPages = Math.ceil(total / limit);
  const totalAll = Object.values(statusCounts).reduce((s, v) => s + v, 0);
  const pendingCount = statusCounts["PENDING"] || 0;

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Bayiler</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            {totalAll} bayi
            {pendingCount > 0 && (
              <span className="ml-2 font-medium text-amber-600">· {pendingCount} onay bekliyor</span>
            )}
          </p>
        </div>
        <Link href="/admin/bayiler/yeni">
          <Button>
            <Plus className="mr-1.5 h-4 w-4" /> Yeni Bayi
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <Building2 className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalAll}</p>
              <p className="text-[12px] text-gray-500">Toplam Bayi</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{statusCounts["ACTIVE"] || 0}</p>
              <p className="text-[12px] text-gray-500">Aktif</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-[12px] text-gray-500">Onay Bekliyor</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <Ban className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{statusCounts["SUSPENDED"] || 0}</p>
              <p className="text-[12px] text-gray-500">Askıda</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const count = opt.value ? statusCounts[opt.value] || 0 : totalAll;
          return (
            <button
              key={opt.value}
              onClick={() => { setStatus(opt.value); setPage(1); }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                status === opt.value
                  ? "border-[#7AC143] bg-[#7AC143]/10 font-medium text-[#7AC143]"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
              {count > 0 && (
                <span className="ml-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Firma adı, bayi kodu, telefon, e-posta..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
            />
          </div>
          <Button type="submit" size="sm">Ara</Button>
          {(search || tier) && (
            <Button variant="outline" size="sm" onClick={() => { setSearch(""); setTier(""); setPage(1); }}>
              <X className="mr-1 h-3.5 w-3.5" /> Temizle
            </Button>
          )}
        </form>
        <div className="flex gap-2">
          <select
            value={tier}
            onChange={(e) => { setTier(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
          >
            <option value="">Tüm Seviyeler</option>
            <option value="standard">Standard</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
          >
            <option value="newest">En Yeni</option>
            <option value="oldest">En Eski</option>
            <option value="name">İsme Göre</option>
            <option value="balance_desc">Bakiye (Yüksek)</option>
            <option value="balance_asc">Bakiye (Düşük)</option>
          </select>
        </div>
      </div>

      {/* Pending Applications Alert */}
      {pendingCount > 0 && !status && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-medium">{pendingCount} yeni bayi başvurusu</span> onayınızı bekliyor.
          </p>
          <button
            onClick={() => { setStatus("PENDING"); setPage(1); }}
            className="ml-auto text-sm font-medium text-amber-700 hover:text-amber-900"
          >
            Görüntüle →
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50/80">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Firma</th>
                <th className="px-4 py-3 font-medium text-gray-700">Bayi Kodu</th>
                <th className="px-4 py-3 font-medium text-gray-700">İletişim</th>
                <th className="px-4 py-3 font-medium text-gray-700">Konum</th>
                <th className="px-4 py-3 font-medium text-gray-700">Seviye</th>
                <th className="px-4 py-3 font-medium text-gray-700">Cari Bakiye</th>
                <th className="px-4 py-3 font-medium text-gray-700">Siparişler</th>
                <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                <th className="px-4 py-3 font-medium text-gray-700">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dealers.map((dealer) => {
                const statusInfo = STATUS_MAP[dealer.status] || { label: dealer.status, variant: "discount" as const };
                const tierInfo = TIER_BADGES[dealer.dealerTier] || TIER_BADGES.standard;
                return (
                  <tr key={dealer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/bayiler/${dealer.id}`} className="font-medium text-gray-900 hover:text-[#7AC143]">
                        {dealer.companyName}
                      </Link>
                      <p className="text-xs text-gray-500">{dealer.taxNumber}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{dealer.dealerCode}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{dealer.contactName}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="h-3 w-3" /> {dealer.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="h-3.5 w-3.5" />
                        {dealer.city}/{dealer.district}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tierInfo.className}`}>
                        {tierInfo.label}
                      </span>
                      {dealer.discountRate != null && (
                        <p className="text-xs text-gray-500 mt-0.5">%{dealer.discountRate}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${dealer.creditBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatPrice(dealer.creditBalance)}
                      </span>
                      {dealer.creditLimit != null && (
                        <p className="text-xs text-gray-500">Limit: {formatPrice(dealer.creditLimit)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm">{dealer._count.orders}</span>
                      </div>
                      <p className="text-xs text-gray-500">{formatPrice(dealer.totalRevenue)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/bayiler/${dealer.id}`}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 inline-flex"
                        title="Detay"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {dealers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    {search || status || tier ? "Eşleşen bayi bulunamadı" : "Henüz bayi yok"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Sayfa {page} / {totalPages} · Toplam {total} bayi</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="rounded-lg border p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pn: number;
              if (totalPages <= 5) pn = i + 1;
              else if (page <= 3) pn = i + 1;
              else if (page >= totalPages - 2) pn = totalPages - 4 + i;
              else pn = page - 2 + i;
              return (
                <button
                  key={pn}
                  onClick={() => setPage(pn)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    page === pn ? "border-[#7AC143] bg-[#7AC143]/10 font-medium text-[#7AC143]" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {pn}
                </button>
              );
            })}
            <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="rounded-lg border p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
