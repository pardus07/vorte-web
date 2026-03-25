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
  Users,
  Mail,
  Factory,
  Clock,
  ChevronRight,
  Eye,
  RefreshCw,
  BarChart3,
  ArrowUpRight,
  Zap,
  CircleDollarSign,
  ArrowUp,
  ArrowDown,
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

const STATUS_MAP: Record<string, { label: string; dot: string; bg: string }> = {
  PENDING: { label: "Bekliyor", dot: "bg-amber-400", bg: "bg-amber-50 text-amber-700" },
  PAID: { label: "Ödendi", dot: "bg-emerald-400", bg: "bg-emerald-50 text-emerald-700" },
  PROCESSING: { label: "Hazırlanıyor", dot: "bg-blue-400", bg: "bg-blue-50 text-blue-700" },
  SHIPPED: { label: "Kargoda", dot: "bg-purple-400", bg: "bg-purple-50 text-purple-700" },
  DELIVERED: { label: "Teslim", dot: "bg-emerald-400", bg: "bg-emerald-50 text-emerald-700" },
  CANCELLED: { label: "İptal", dot: "bg-red-400", bg: "bg-red-50 text-red-700" },
};

const PROD_STATUS: Record<string, { label: string; color: string }> = {
  planned: { label: "Planlandı", color: "text-gray-500" },
  cutting: { label: "Kesim", color: "text-blue-600" },
  sewing: { label: "Dikim", color: "text-indigo-600" },
  quality: { label: "Kalite", color: "text-amber-600" },
  packaging: { label: "Paket", color: "text-purple-600" },
  completed: { label: "Tamam", color: "text-emerald-600" },
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
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#7AC143]" />
          </div>
          <p className="text-[13px] text-gray-400">Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-gray-400">
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

  const avgDailyRevenue = stats.weekRevenue / 7;
  const todayDelta = avgDailyRevenue > 0
    ? ((stats.todayRevenue - avgDailyRevenue) / avgDailyRevenue) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{greeting}</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-medium text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:shadow disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Today Revenue */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F1117] to-[#1a1d27] p-5 text-white shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">Bugün</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{formatPrice(stats.todayRevenue)}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-medium">
                  {stats.todayOrders} sipariş
                </span>
                {todayDelta !== 0 && (
                  <span className={`flex items-center gap-0.5 text-[11px] font-medium ${todayDelta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {todayDelta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {Math.abs(todayDelta).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-xl bg-[#7AC143]/20 p-2.5">
              <CircleDollarSign className="h-5 w-5 text-[#7AC143]" />
            </div>
          </div>
          <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-[#7AC143]/5" />
          <div className="absolute -bottom-3 -right-3 h-16 w-16 rounded-full bg-[#7AC143]/10" />
        </div>

        {/* Week */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">Bu Hafta</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{formatPrice(stats.weekRevenue)}</p>
              <p className="mt-1 text-[12px] text-gray-400">{stats.weekOrders} sipariş</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-2.5">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Month */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">Bu Ay</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{formatPrice(stats.monthRevenue)}</p>
              <p className="mt-1 text-[12px] text-gray-400">{stats.monthOrders} sipariş</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-2.5">
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Customers */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">Müşteri</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
              <p className="mt-1 text-[12px] text-gray-400">{stats.activeDealers} bayi</p>
            </div>
            <div className="rounded-xl bg-indigo-50 p-2.5">
              <Users className="h-5 w-5 text-indigo-500" />
            </div>
          </div>
        </div>
      </div>

      {/* ALERT STRIP */}
      {(stats.pendingOrders > 0 || stats.lowStockVariants > 0 || stats.unreadMessages > 0 || stats.pendingDealers > 0) && (
        <div className="flex flex-wrap gap-2">
          {stats.pendingOrders > 0 && (
            <Link href="/admin/siparisler?status=PENDING" className="group flex items-center gap-2 rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-white px-4 py-2.5 text-[13px] font-medium text-orange-700 transition-all hover:border-orange-200 hover:shadow-sm">
              <ShoppingCart className="h-4 w-4 text-orange-500" />
              <span className="font-bold">{stats.pendingOrders}</span> bekleyen sipariş
              <ChevronRight className="h-3.5 w-3.5 text-orange-300 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
          {stats.lowStockVariants > 0 && (
            <Link href="/admin/urunler?stock=low" className="group flex items-center gap-2 rounded-xl border border-red-100 bg-gradient-to-r from-red-50 to-white px-4 py-2.5 text-[13px] font-medium text-red-700 transition-all hover:border-red-200 hover:shadow-sm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-bold">{stats.lowStockVariants}</span> stok uyarısı
              <ChevronRight className="h-3.5 w-3.5 text-red-300 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
          {stats.unreadMessages > 0 && (
            <Link href="/admin/mesajlar" className="group flex items-center gap-2 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white px-4 py-2.5 text-[13px] font-medium text-blue-700 transition-all hover:border-blue-200 hover:shadow-sm">
              <Mail className="h-4 w-4 text-blue-500" />
              <span className="font-bold">{stats.unreadMessages}</span> okunmamış mesaj
              <ChevronRight className="h-3.5 w-3.5 text-blue-300 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
          {stats.pendingDealers > 0 && (
            <Link href="/admin/bayiler?status=PENDING" className="group flex items-center gap-2 rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 to-white px-4 py-2.5 text-[13px] font-medium text-amber-700 transition-all hover:border-amber-200 hover:shadow-sm">
              <Building2 className="h-4 w-4 text-amber-500" />
              <span className="font-bold">{stats.pendingDealers}</span> bayi başvurusu
              <ChevronRight className="h-3.5 w-3.5 text-amber-300 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      )}

      {/* CHARTS */}
      <SalesLineChart data={charts.daily} />

      <div className="grid gap-5 lg:grid-cols-2">
        <CategoryPieChart data={charts.categorySales} />
        <ComparisonBarChart data={charts.comparison} />
      </div>

      {/* ACTIVITY PANELS */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
              <ShoppingCart className="h-4 w-4 text-gray-400" /> Son Siparişler
            </h3>
            <Link href="/admin/siparisler" className="flex items-center gap-1 text-[12px] font-medium text-[#7AC143] hover:underline">
              Tümünü Gör <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="border-t border-gray-50">
            {quickAccess.recentOrders.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-gray-400">Henüz sipariş yok</div>
            ) : (
              quickAccess.recentOrders.map((order, i) => {
                const st = STATUS_MAP[order.status] || { label: order.status, dot: "bg-gray-400", bg: "bg-gray-50 text-gray-600" };
                return (
                  <Link key={order.id} href={`/admin/siparisler/${order.id}`}
                    className={`flex items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50/70 ${i > 0 ? "border-t border-gray-50" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] font-semibold text-gray-800">#{order.orderNumber}</span>
                        {order.orderType === "WHOLESALE" && (
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-purple-700">TOPTAN</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {order.customerName} · {new Date(order.createdAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pl-3">
                      <span className="text-[13px] font-bold text-gray-800">{formatPriceDetailed(order.totalAmount)}</span>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
              <AlertTriangle className="h-4 w-4 text-red-400" /> Stok Uyarıları
            </h3>
            <Link href="/admin/urunler" className="flex items-center gap-1 text-[12px] font-medium text-[#7AC143] hover:underline">
              Tümünü Gör <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="border-t border-gray-50">
            {quickAccess.lowStock.length === 0 ? (
              <div className="flex flex-col items-center gap-2.5 p-10">
                <div className="rounded-full bg-emerald-50 p-3"><Package className="h-5 w-5 text-emerald-400" /></div>
                <p className="text-[13px] text-gray-400">Tüm stoklar yeterli</p>
              </div>
            ) : (
              quickAccess.lowStock.map((item, i) => (
                <div key={item.id} className={`flex items-center justify-between px-5 py-3 ${i > 0 ? "border-t border-gray-50" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-gray-700">{item.productName}</p>
                    <p className="text-[11px] text-gray-400">{item.color} · {item.size}</p>
                  </div>
                  {item.stock === 0 ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-600">Tükendi</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">{item.stock} adet</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
              <Mail className="h-4 w-4 text-blue-400" /> Mesajlar
            </h3>
            <Link href="/admin/mesajlar" className="flex items-center gap-1 text-[12px] font-medium text-[#7AC143] hover:underline">
              Tümünü Gör <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="border-t border-gray-50">
            {quickAccess.unreadMessages.length === 0 ? (
              <div className="flex flex-col items-center gap-2.5 p-10">
                <div className="rounded-full bg-blue-50 p-3"><Mail className="h-5 w-5 text-blue-300" /></div>
                <p className="text-[13px] text-gray-400">Yeni mesaj yok</p>
              </div>
            ) : (
              quickAccess.unreadMessages.map((msg, i) => (
                <Link key={msg.id} href="/admin/mesajlar"
                  className={`block px-5 py-3 transition-colors hover:bg-gray-50/70 ${i > 0 ? "border-t border-gray-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-800">{msg.name}</p>
                      <p className="mt-0.5 truncate text-[12px] text-gray-500">{msg.subject}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-gray-300">
                      {new Date(msg.createdAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Production */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
              <Factory className="h-4 w-4 text-indigo-400" /> Üretim Durumu
            </h3>
            <Link href="/admin/uretim" className="flex items-center gap-1 text-[12px] font-medium text-[#7AC143] hover:underline">
              Tümünü Gör <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="border-t border-gray-50">
            {quickAccess.production.length === 0 ? (
              <div className="flex flex-col items-center gap-2.5 p-10">
                <div className="rounded-full bg-indigo-50 p-3"><Factory className="h-5 w-5 text-indigo-300" /></div>
                <p className="text-[13px] text-gray-400">Aktif üretim yok</p>
              </div>
            ) : (
              quickAccess.production.map((prod, i) => {
                const isOverdue = new Date(prod.targetDate) < new Date();
                const pst = PROD_STATUS[prod.status] || { label: prod.status, color: "text-gray-500" };
                return (
                  <Link key={prod.id} href={`/admin/uretim/${prod.id}`}
                    className={`flex items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50/70 ${i > 0 ? "border-t border-gray-50" : ""}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] font-semibold text-gray-700">{prod.orderNumber}</span>
                        <span className={`text-[11px] font-semibold ${pst.color}`}>{pst.label}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {prod.totalQuantity.toLocaleString("tr-TR")} adet · {new Date(prod.targetDate).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    {isOverdue && (
                      <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
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

      {/* QUICK LINKS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/bayiler" className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-gray-200 hover:shadow">
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-xl bg-teal-50 p-2.5 transition-colors group-hover:bg-teal-100"><Building2 className="h-5 w-5 text-teal-600" /></div>
            <ArrowUpRight className="h-4 w-4 text-gray-300 transition-all group-hover:text-gray-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.activeDealers}</p>
          <p className="mt-0.5 text-[12px] text-gray-500">Aktif Bayi</p>
        </Link>
        <Link href="/admin/raporlar" className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-gray-200 hover:shadow">
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-xl bg-green-50 p-2.5 transition-colors group-hover:bg-green-100"><BarChart3 className="h-5 w-5 text-green-600" /></div>
            <ArrowUpRight className="h-4 w-4 text-gray-300 transition-all group-hover:text-gray-500" />
          </div>
          <p className="text-[15px] font-bold text-gray-900">Raporlar</p>
          <p className="mt-0.5 text-[12px] text-gray-500">Detaylı analizler</p>
        </Link>
        <Link href="/admin/seo" className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-gray-200 hover:shadow">
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-xl bg-amber-50 p-2.5 transition-colors group-hover:bg-amber-100"><Eye className="h-5 w-5 text-amber-600" /></div>
            <ArrowUpRight className="h-4 w-4 text-gray-300 transition-all group-hover:text-gray-500" />
          </div>
          <p className="text-[15px] font-bold text-gray-900">SEO</p>
          <p className="mt-0.5 text-[12px] text-gray-500">Arama motoru</p>
        </Link>
        <Link href="/admin/musteriler" className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-gray-200 hover:shadow">
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-xl bg-indigo-50 p-2.5 transition-colors group-hover:bg-indigo-100"><Zap className="h-5 w-5 text-indigo-600" /></div>
            <ArrowUpRight className="h-4 w-4 text-gray-300 transition-all group-hover:text-gray-500" />
          </div>
          <p className="text-[15px] font-bold text-gray-900">Müşteriler</p>
          <p className="mt-0.5 text-[12px] text-gray-500">Kullanıcı yönetimi</p>
        </Link>
      </div>
    </div>
  );
}
