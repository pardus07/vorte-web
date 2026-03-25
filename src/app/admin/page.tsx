"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Building2,
  Calendar,
  Users,
  Mail,
  Factory,
  Clock,
  ChevronRight,
  Eye,
  RefreshCw,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";

import { SalesLineChart, CategoryPieChart, ComparisonBarChart } from "@/components/admin/DashboardCharts";

interface DashboardData {
  stats: {
    todayRevenue: number;
    todayOrders: number;
    weekRevenue: number;
    weekOrders: number;
    monthRevenue: number;
    monthOrders: number;
    pendingOrders: number;
    lowStockVariants: number;
    activeDealers: number;
    pendingDealers: number;
    unreadMessages: number;
    totalCustomers: number;
  };
  charts: {
    daily: { date: string; revenue: number; orders: number }[];
    categorySales: { name: string; value: number }[];
    comparison: {
      retail: { revenue: number; count: number };
      wholesale: { revenue: number; count: number };
    };
  };
  quickAccess: {
    recentOrders: {
      id: string;
      orderNumber: string;
      totalAmount: number;
      status: string;
      orderType: string;
      customerName: string;
      createdAt: string;
    }[];
    lowStock: {
      id: string;
      productName: string;
      productSlug: string;
      color: string;
      size: string;
      stock: number;
    }[];
    unreadMessages: {
      id: string;
      name: string;
      subject: string;
      createdAt: string;
    }[];
    production: {
      id: string;
      orderNumber: string;
      status: string;
      totalQuantity: number;
      targetDate: string;
    }[];
    pendingDealers: number;
  };
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatPriceDetailed(price: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(price);
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Bekliyor", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  PAID: { label: "Ödendi", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  PROCESSING: { label: "Hazırlanıyor", className: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  SHIPPED: { label: "Kargoda", className: "bg-purple-50 text-purple-700 ring-1 ring-purple-200" },
  DELIVERED: { label: "Teslim", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  CANCELLED: { label: "İptal", className: "bg-red-50 text-red-700 ring-1 ring-red-200" },
};

const PROD_STATUS: Record<string, { label: string; className: string }> = {
  planned: { label: "Planlandı", className: "bg-gray-50 text-gray-600 ring-1 ring-gray-200" },
  cutting: { label: "Kesim", className: "bg-blue-50 text-blue-600 ring-1 ring-blue-200" },
  sewing: { label: "Dikim", className: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200" },
  quality: { label: "Kalite", className: "bg-amber-50 text-amber-600 ring-1 ring-amber-200" },
  packaging: { label: "Paket", className: "bg-purple-50 text-purple-600 ring-1 ring-purple-200" },
  completed: { label: "Tamam", className: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200" },
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#7AC143]" />
          <p className="text-sm text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center text-gray-400">
        Veri yüklenemedi
      </div>
    );
  }

  const { stats, charts, quickAccess } = data;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Günaydın";
    if (h < 18) return "İyi günler";
    return "İyi akşamlar";
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{greeting} 👋</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:shadow disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      {/* Revenue Cards — prominent */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Today */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#7AC143] to-[#5B9A2E] p-5 text-white shadow-lg shadow-[#7AC143]/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/70">Bugünkü Satış</p>
              <p className="mt-1.5 text-2xl font-bold">{formatPrice(stats.todayRevenue)}</p>
              <p className="mt-1 text-[12px] text-white/60">{stats.todayOrders} sipariş</p>
            </div>
            <div className="rounded-xl bg-white/15 p-2.5">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />
        </div>

        {/* This Week */}
        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Bu Hafta</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900">{formatPrice(stats.weekRevenue)}</p>
              <p className="mt-1 text-[12px] text-gray-400">{stats.weekOrders} sipariş</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-2.5">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Bu Ay</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900">{formatPrice(stats.monthRevenue)}</p>
              <p className="mt-1 text-[12px] text-gray-400">{stats.monthOrders} sipariş</p>
            </div>
            <div className="rounded-xl bg-indigo-50 p-2.5">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className={`rounded-lg p-2 ${stats.pendingOrders > 0 ? "bg-orange-50" : "bg-gray-50"}`}>
            <ShoppingCart className={`h-4.5 w-4.5 ${stats.pendingOrders > 0 ? "text-orange-500" : "text-gray-400"}`} />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.pendingOrders}</p>
            <p className="text-[11px] text-gray-400">Bekleyen Sipariş</p>
          </div>
          {stats.pendingOrders > 0 && (
            <Link href="/admin/siparisler?status=PENDING" className="ml-auto rounded-lg bg-orange-50 p-1.5 text-orange-500 hover:bg-orange-100">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className={`rounded-lg p-2 ${stats.lowStockVariants > 0 ? "bg-red-50" : "bg-gray-50"}`}>
            <AlertTriangle className={`h-4.5 w-4.5 ${stats.lowStockVariants > 0 ? "text-red-500" : "text-gray-400"}`} />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.lowStockVariants}</p>
            <p className="text-[11px] text-gray-400">Stok Uyarısı</p>
          </div>
          {stats.lowStockVariants > 0 && (
            <Link href="/admin/urunler?stock=low" className="ml-auto rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="rounded-lg bg-teal-50 p-2">
            <Building2 className="h-4.5 w-4.5 text-teal-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.activeDealers}</p>
            <p className="text-[11px] text-gray-400">
              Aktif Bayi{stats.pendingDealers > 0 && ` · ${stats.pendingDealers} başvuru`}
            </p>
          </div>
          <Link href="/admin/bayiler" className="ml-auto rounded-lg bg-teal-50 p-1.5 text-teal-500 hover:bg-teal-100">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Quick Alert Bar */}
      {(stats.unreadMessages > 0 || stats.pendingDealers > 0) && (
        <div className="flex flex-wrap gap-2.5">
          {stats.unreadMessages > 0 && (
            <Link href="/admin/mesajlar" className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3.5 py-2 text-[13px] text-blue-700 transition-colors hover:bg-blue-50">
              <Mail className="h-4 w-4" />
              {stats.unreadMessages} okunmamış mesaj
              <ChevronRight className="h-3 w-3 opacity-50" />
            </Link>
          )}
          {stats.pendingDealers > 0 && (
            <Link href="/admin/bayiler?status=PENDING" className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-3.5 py-2 text-[13px] text-amber-700 transition-colors hover:bg-amber-50">
              <Building2 className="h-4 w-4" />
              {stats.pendingDealers} bekleyen bayi başvurusu
              <ChevronRight className="h-3 w-3 opacity-50" />
            </Link>
          )}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <SalesLineChart data={charts.daily} />
        </div>
        <CategoryPieChart data={charts.categorySales} />
        <ComparisonBarChart data={charts.comparison} />
      </div>

      {/* Quick Access Grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
              <ShoppingCart className="h-4 w-4 text-gray-400" />
              Son Siparişler
            </h3>
            <Link href="/admin/siparisler" className="text-[12px] font-medium text-[#7AC143] hover:underline">
              Tümü →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {quickAccess.recentOrders.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-gray-400">Henüz sipariş yok</div>
            ) : (
              quickAccess.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/siparisler/${order.id}`}
                  className="flex items-center justify-between px-5 py-2.5 transition-colors hover:bg-gray-50/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-mono font-medium text-gray-700">#{order.orderNumber}</span>
                      {order.orderType === "WHOLESALE" && (
                        <span className="rounded-md bg-purple-50 px-1.5 py-0.5 text-[9px] font-semibold text-purple-600 ring-1 ring-purple-200">
                          TOPTAN
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {order.customerName} · {new Date(order.createdAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[12px] font-semibold text-gray-700">{formatPriceDetailed(order.totalAmount)}</span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${STATUS_MAP[order.status]?.className || "bg-gray-50 text-gray-600 ring-1 ring-gray-200"}`}>
                      {STATUS_MAP[order.status]?.label || order.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Stok Uyarıları
            </h3>
            <Link href="/admin/urunler" className="text-[12px] font-medium text-[#7AC143] hover:underline">
              Tümü →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {quickAccess.lowStock.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8">
                <div className="rounded-full bg-emerald-50 p-2.5">
                  <Package className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="text-[13px] text-gray-400">Stok uyarısı yok</p>
              </div>
            ) : (
              quickAccess.lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-gray-700">{item.productName}</p>
                    <p className="text-[11px] text-gray-400">{item.color} · {item.size}</p>
                  </div>
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    item.stock === 0
                      ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                      : "bg-amber-50 text-amber-600 ring-1 ring-amber-200"
                  }`}>
                    {item.stock === 0 ? "Tükendi" : `${item.stock} adet`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unread Messages */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
              <Mail className="h-4 w-4 text-blue-400" />
              Mesajlar
            </h3>
            <Link href="/admin/mesajlar" className="text-[12px] font-medium text-[#7AC143] hover:underline">
              Tümü →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {quickAccess.unreadMessages.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8">
                <div className="rounded-full bg-blue-50 p-2.5">
                  <Mail className="h-5 w-5 text-blue-300" />
                </div>
                <p className="text-[13px] text-gray-400">Yeni mesaj yok</p>
              </div>
            ) : (
              quickAccess.unreadMessages.map((msg) => (
                <Link
                  key={msg.id}
                  href="/admin/mesajlar"
                  className="block px-5 py-2.5 transition-colors hover:bg-gray-50/50"
                >
                  <p className="text-[13px] font-medium text-gray-700">{msg.name}</p>
                  <p className="mt-0.5 truncate text-[12px] text-gray-400">{msg.subject}</p>
                  <p className="mt-0.5 text-[11px] text-gray-300">
                    {new Date(msg.createdAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Production Status */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
              <Factory className="h-4 w-4 text-indigo-400" />
              Üretim Durumu
            </h3>
            <Link href="/admin/uretim" className="text-[12px] font-medium text-[#7AC143] hover:underline">
              Tümü →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {quickAccess.production.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8">
                <div className="rounded-full bg-indigo-50 p-2.5">
                  <Factory className="h-5 w-5 text-indigo-300" />
                </div>
                <p className="text-[13px] text-gray-400">Aktif üretim yok</p>
              </div>
            ) : (
              quickAccess.production.map((prod) => {
                const isOverdue = new Date(prod.targetDate) < new Date();
                return (
                  <Link
                    key={prod.id}
                    href={`/admin/uretim/${prod.id}`}
                    className="flex items-center justify-between px-5 py-2.5 transition-colors hover:bg-gray-50/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-mono font-medium text-gray-700">{prod.orderNumber}</span>
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${PROD_STATUS[prod.status]?.className || "bg-gray-50 text-gray-500 ring-1 ring-gray-200"}`}>
                          {PROD_STATUS[prod.status]?.label || prod.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {prod.totalQuantity} adet · {new Date(prod.targetDate).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    {isOverdue && (
                      <span className="flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-200">
                        <Clock className="h-3 w-3" /> Gecikmiş
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Quick Links */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/musteriler" className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-gray-200 hover:shadow">
          <div className="rounded-lg bg-indigo-50 p-2 transition-colors group-hover:bg-indigo-100">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.totalCustomers}</p>
            <p className="text-[11px] text-gray-500">Toplam Müşteri</p>
          </div>
          <ArrowUpRight className="ml-auto h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
        </Link>
        <Link href="/admin/raporlar" className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-gray-200 hover:shadow">
          <div className="rounded-lg bg-green-50 p-2 transition-colors group-hover:bg-green-100">
            <BarChart3 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-gray-900">Raporlar</p>
            <p className="text-[11px] text-gray-500">Detaylı analizler</p>
          </div>
          <ArrowUpRight className="ml-auto h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
        </Link>
        <Link href="/admin/seo" className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-gray-200 hover:shadow">
          <div className="rounded-lg bg-amber-50 p-2 transition-colors group-hover:bg-amber-100">
            <Eye className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-gray-900">SEO</p>
            <p className="text-[11px] text-gray-500">Arama motoru araçları</p>
          </div>
          <ArrowUpRight className="ml-auto h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
        </Link>
      </div>
    </div>
  );
}
