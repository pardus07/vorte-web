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
    minimumFractionDigits: 2,
  }).format(price);
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Bekliyor", color: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Ödendi", color: "bg-green-100 text-green-700" },
  PROCESSING: { label: "Hazırlanıyor", color: "bg-blue-100 text-blue-700" },
  SHIPPED: { label: "Kargoda", color: "bg-purple-100 text-purple-700" },
  DELIVERED: { label: "Teslim", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "İptal", color: "bg-red-100 text-red-700" },
};

const PROD_STATUS: Record<string, { label: string; color: string }> = {
  planned: { label: "Planlandı", color: "bg-gray-100 text-gray-600" },
  cutting: { label: "Kesim", color: "bg-blue-100 text-blue-600" },
  sewing: { label: "Dikim", color: "bg-indigo-100 text-indigo-600" },
  quality: { label: "Kalite", color: "bg-yellow-100 text-yellow-600" },
  packaging: { label: "Paket", color: "bg-purple-100 text-purple-600" },
  completed: { label: "Tamam", color: "bg-green-100 text-green-600" },
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
      <div className="flex h-96 items-center justify-center text-gray-400">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Yükleniyor...
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

  const statCards = [
    {
      label: "Bugünkü Satış",
      value: formatPrice(stats.todayRevenue),
      sub: `${stats.todayOrders} sipariş`,
      icon: DollarSign,
      color: "bg-green-100 text-green-600",
    },
    {
      label: "Bu Hafta",
      value: formatPrice(stats.weekRevenue),
      sub: `${stats.weekOrders} sipariş`,
      icon: Calendar,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Bu Ay",
      value: formatPrice(stats.monthRevenue),
      sub: `${stats.monthOrders} sipariş`,
      icon: TrendingUp,
      color: "bg-indigo-100 text-indigo-600",
    },
    {
      label: "Bekleyen Sipariş",
      value: stats.pendingOrders,
      sub: "onay bekliyor",
      icon: ShoppingCart,
      color: stats.pendingOrders > 0 ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-600",
    },
    {
      label: "Stok Uyarısı",
      value: stats.lowStockVariants,
      sub: "düşük stok",
      icon: AlertTriangle,
      color: stats.lowStockVariants > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600",
    },
    {
      label: "Aktif Bayi",
      value: stats.activeDealers,
      sub: stats.pendingDealers > 0 ? `${stats.pendingDealers} başvuru` : "bayi",
      icon: Building2,
      color: "bg-teal-100 text-teal-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Mağaza durumuna genel bakış</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                  <p className="mt-1 truncate text-lg font-bold text-gray-900">{stat.value}</p>
                  <p className="text-[11px] text-gray-400">{stat.sub}</p>
                </div>
                <div className={`ml-2 flex-shrink-0 rounded-lg p-2 ${stat.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Alert Bar */}
      {(stats.unreadMessages > 0 || stats.pendingDealers > 0 || stats.lowStockVariants > 0) && (
        <div className="flex flex-wrap gap-3">
          {stats.unreadMessages > 0 && (
            <Link href="/admin/mesajlar" className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100">
              <Mail className="h-4 w-4" />
              {stats.unreadMessages} okunmamış mesaj
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
          {stats.pendingDealers > 0 && (
            <Link href="/admin/bayiler" className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm text-orange-700 hover:bg-orange-100">
              <Building2 className="h-4 w-4" />
              {stats.pendingDealers} bekleyen bayi başvurusu
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
          {stats.lowStockVariants > 0 && (
            <Link href="/admin/urunler" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100">
              <AlertTriangle className="h-4 w-4" />
              {stats.lowStockVariants} ürün düşük stokta
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <SalesLineChart data={charts.daily} />
        </div>
        <CategoryPieChart data={charts.categorySales} />
        <ComparisonBarChart data={charts.comparison} />
      </div>

      {/* Quick Access Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <ShoppingCart className="h-4 w-4 text-gray-400" />
              Son Siparişler
            </h3>
            <Link href="/admin/siparisler" className="text-xs text-[#7AC143] hover:underline">
              Tümünü Gör →
            </Link>
          </div>
          <div className="divide-y">
            {quickAccess.recentOrders.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">Henüz sipariş yok</div>
            ) : (
              quickAccess.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/siparisler/${order.id}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-gray-700">{order.orderNumber}</span>
                      {order.orderType === "WHOLESALE" && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-medium text-purple-600">TOPTAN</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {order.customerName} · {new Date(order.createdAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">{formatPrice(order.totalAmount)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_MAP[order.status]?.color || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_MAP[order.status]?.label || order.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Stok Uyarıları
            </h3>
            <Link href="/admin/urunler" className="text-xs text-[#7AC143] hover:underline">
              Tümünü Gör →
            </Link>
          </div>
          <div className="divide-y">
            {quickAccess.lowStock.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                <Package className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                Stok uyarısı yok
              </div>
            ) : (
              quickAccess.lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-700">{item.productName}</p>
                    <p className="text-[11px] text-gray-400">{item.color} · {item.size}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.stock === 0 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                    {item.stock === 0 ? "Tükendi" : `${item.stock} adet`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unread Messages */}
        <div className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Mail className="h-4 w-4 text-blue-400" />
              Okunmamış Mesajlar
            </h3>
            <Link href="/admin/mesajlar" className="text-xs text-[#7AC143] hover:underline">
              Tümünü Gör →
            </Link>
          </div>
          <div className="divide-y">
            {quickAccess.unreadMessages.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                <Mail className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                Yeni mesaj yok
              </div>
            ) : (
              quickAccess.unreadMessages.map((msg) => (
                <Link
                  key={msg.id}
                  href="/admin/mesajlar"
                  className="block px-4 py-2.5 hover:bg-gray-50"
                >
                  <p className="text-sm font-medium text-gray-700">{msg.name}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-400">{msg.subject}</p>
                  <p className="mt-0.5 text-[11px] text-gray-300">
                    {new Date(msg.createdAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Production Status */}
        <div className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Factory className="h-4 w-4 text-indigo-400" />
              Üretim Durumu
            </h3>
            <Link href="/admin/uretim" className="text-xs text-[#7AC143] hover:underline">
              Tümünü Gör →
            </Link>
          </div>
          <div className="divide-y">
            {quickAccess.production.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                <Factory className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                Aktif üretim yok
              </div>
            ) : (
              quickAccess.production.map((prod) => {
                const isOverdue = new Date(prod.targetDate) < new Date();
                return (
                  <Link
                    key={prod.id}
                    href={`/admin/uretim/${prod.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium text-gray-700">{prod.orderNumber}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PROD_STATUS[prod.status]?.color || "bg-gray-100 text-gray-500"}`}>
                          {PROD_STATUS[prod.status]?.label || prod.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {prod.totalQuantity} adet · Hedef: {new Date(prod.targetDate).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    {isOverdue && (
                      <span className="flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
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

      {/* Bottom Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/admin/musteriler" className="flex items-center gap-3 rounded-lg border bg-white p-4 hover:bg-gray-50">
          <div className="rounded-lg bg-indigo-100 p-2">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.totalCustomers}</p>
            <p className="text-xs text-gray-500">Toplam Müşteri</p>
          </div>
        </Link>
        <Link href="/admin/raporlar" className="flex items-center gap-3 rounded-lg border bg-white p-4 hover:bg-gray-50">
          <div className="rounded-lg bg-green-100 p-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Raporlar</p>
            <p className="text-xs text-gray-500">Detaylı analizler</p>
          </div>
        </Link>
        <Link href="/admin/seo" className="flex items-center gap-3 rounded-lg border bg-white p-4 hover:bg-gray-50">
          <div className="rounded-lg bg-amber-100 p-2">
            <Eye className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">SEO</p>
            <p className="text-xs text-gray-500">Arama motoru araçları</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
