"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PERIOD_OPTIONS = [
  { value: "today", label: "Bugün" },
  { value: "week", label: "Bu Hafta" },
  { value: "month", label: "Bu Ay" },
  { value: "year", label: "Bu Yıl" },
  { value: "custom", label: "Özel" },
];

interface ReportData {
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    totalOrders: number;
    avgOrderAmount: number;
    retailCount: number;
    retailRevenue: number;
    wholesaleCount: number;
    wholesaleRevenue: number;
    refundedCount: number;
    refundedAmount: number;
  };
  dailyData: { date: string; revenue: number; cost: number; orders: number }[];
  topProducts: {
    name: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    quantity: number;
  }[];
  categoryStats: {
    name: string;
    revenue: number;
    cost: number;
    quantity: number;
  }[];
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "categories">("overview");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (period === "custom") {
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
    }

    try {
      const res = await fetch(`/api/admin/reports?${params}`);
      const d = await res.json();
      setData(d);
    } catch {
      // silent
    }
    setLoading(false);
  }, [period, dateFrom, dateTo]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

  const formatShortPrice = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M ₺`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K ₺`;
    return `${n.toFixed(0)} ₺`;
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finansal Raporlar</h1>
        <div className="mt-12 flex justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, dailyData, topProducts, categoryStats } = data;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finansal Raporlar</h1>
          <p className="mt-1 text-sm text-gray-500">
            {PERIOD_OPTIONS.find((p) => p.value === period)?.label || "Bu Ay"} raporu
          </p>
        </div>
        <div className="flex items-center gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                period === opt.value
                  ? "border-[#7AC143] bg-[#7AC143]/10 font-medium text-[#7AC143]"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      {period === "custom" && (
        <div className="mt-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none" />
          <span className="text-sm text-gray-400">—</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none" />
          <Button size="sm" variant="outline" onClick={fetchReport}>Uygula</Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-5">
          <div className="flex items-center justify-between">
            <DollarSign className="h-8 w-8 text-[#7AC143]" />
            <Badge variant="success">Gelir</Badge>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">{formatPrice(summary.totalRevenue)}</p>
          <p className="mt-1 text-sm text-gray-500">Toplam Satış</p>
        </div>
        <div className="rounded-lg border bg-white p-5">
          <div className="flex items-center justify-between">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <Badge variant={summary.totalProfit >= 0 ? "success" : "discount"}>
              %{summary.profitMargin.toFixed(1)}
            </Badge>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">{formatPrice(summary.totalProfit)}</p>
          <p className="mt-1 text-sm text-gray-500">Toplam Kâr</p>
        </div>
        <div className="rounded-lg border bg-white p-5">
          <div className="flex items-center justify-between">
            <ShoppingCart className="h-8 w-8 text-blue-500" />
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">{summary.totalOrders}</p>
          <p className="mt-1 text-sm text-gray-500">Toplam Sipariş</p>
          <p className="mt-0.5 text-xs text-gray-400">Ortalama: {formatPrice(summary.avgOrderAmount)}</p>
        </div>
        <div className="rounded-lg border bg-white p-5">
          <div className="flex items-center justify-between">
            <TrendingDown className="h-8 w-8 text-red-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">{formatPrice(summary.totalCost)}</p>
          <p className="mt-1 text-sm text-gray-500">Toplam Maliyet</p>
        </div>
      </div>

      {/* Retail vs Wholesale Cards */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Perakende</span>
          </div>
          <p className="mt-2 text-lg font-bold text-gray-900">{formatPrice(summary.retailRevenue)}</p>
          <p className="text-xs text-gray-500">{summary.retailCount} sipariş</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Toptan</span>
          </div>
          <p className="mt-2 text-lg font-bold text-gray-900">{formatPrice(summary.wholesaleRevenue)}</p>
          <p className="text-xs text-gray-500">{summary.wholesaleCount} sipariş</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-400" />
            <span className="text-sm font-medium text-gray-700">İade</span>
          </div>
          <p className="mt-2 text-lg font-bold text-red-600">{formatPrice(summary.refundedAmount)}</p>
          <p className="text-xs text-gray-500">{summary.refundedCount} iade</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 border-b">
        {[
          { key: "overview" as const, label: "Genel Bakış", icon: BarChart3 },
          { key: "products" as const, label: "Ürün Analizi", icon: Package },
          { key: "categories" as const, label: "Kategori Analizi", icon: Users },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-[#7AC143] text-[#7AC143]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Overview — Daily Chart */}
        {activeTab === "overview" && (
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Günlük Satış / Maliyet / Kâr</h3>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                    fontSize={12}
                  />
                  <YAxis tickFormatter={formatShortPrice} fontSize={12} />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, name: any) => [
                      formatPrice(Number(value)),
                      name === "revenue" ? "Gelir" : name === "cost" ? "Maliyet" : "Sipariş",
                    ]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString("tr-TR")}
                  />
                  <Legend formatter={(v) => v === "revenue" ? "Gelir" : v === "cost" ? "Maliyet" : "Sipariş"} />
                  <Bar dataKey="revenue" fill="#7AC143" name="revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" fill="#ef4444" name="cost" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-gray-400">
                Bu dönem için veri yok
              </div>
            )}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              En Çok Satan Ürünler (Top 10)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700">#</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Ürün</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-right">Adet</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-right">Satış</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-right">Maliyet</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-right">Kâr</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-right">Marj</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{p.quantity}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatPrice(p.revenue)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatPrice(p.cost)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${p.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatPrice(p.profit)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={p.margin >= 30 ? "success" : p.margin >= 15 ? "warning" : "discount"}>
                          %{p.margin.toFixed(1)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {topProducts.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Bu dönem için veri yok</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === "categories" && (
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Kategori Bazlı Satışlar</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700">Kategori</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-right">Adet</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-right">Satış</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-right">Maliyet</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-right">Kâr</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-right">Kâr Marjı</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categoryStats.map((c, idx) => {
                    const profit = c.revenue - c.cost;
                    const margin = c.revenue > 0 ? (profit / c.revenue) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{c.quantity}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{formatPrice(c.revenue)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatPrice(c.cost)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatPrice(profit)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={margin >= 30 ? "success" : margin >= 15 ? "warning" : "discount"}>
                            %{margin.toFixed(1)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                  {categoryStats.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Bu dönem için veri yok</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
