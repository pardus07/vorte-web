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
  FileText,
  Layers,
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

  /* ---- Loading State ---- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Finansal Raporlar
          </h1>
          <p className="mt-1 text-[13px] text-gray-500">
            Gelir, maliyet ve kar analizlerinizi inceleyin
          </p>
        </div>
        <div className="flex h-96 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, dailyData, topProducts, categoryStats } = data;

  const TABS = [
    { key: "overview" as const, label: "Genel Bakış", icon: BarChart3 },
    { key: "products" as const, label: "Ürün Analizi", icon: Package },
    { key: "categories" as const, label: "Kategori Analizi", icon: Layers },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header + Period Filter ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Finansal Raporlar
          </h1>
          <p className="mt-1 text-[13px] text-gray-500">
            {PERIOD_OPTIONS.find((p) => p.value === period)?.label || "Bu Ay"} raporu
            &mdash; gelir, maliyet ve kar analizleri
          </p>
        </div>

        {/* Period pills */}
        <div className="flex items-center gap-1 rounded-2xl bg-gray-100/80 p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                period === opt.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Custom Date Range ── */}
      {period === "custom" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
              <Calendar className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]/20"
              />
              <span className="text-sm text-gray-400">&mdash;</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]/20"
              />
            </div>
            <Button size="sm" variant="primary" onClick={fetchReport}>
              Uygula
            </Button>
          </div>
        </div>
      )}

      {/* ── Summary Cards (4-col) ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <Badge variant="success">Gelir</Badge>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {formatPrice(summary.totalRevenue)}
          </p>
          <p className="mt-1 text-[13px] text-gray-500">Toplam Satış</p>
        </div>

        {/* Total Profit */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <Badge variant={summary.totalProfit >= 0 ? "success" : "discount"}>
              %{summary.profitMargin.toFixed(1)}
            </Badge>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {formatPrice(summary.totalProfit)}
          </p>
          <p className="mt-1 text-[13px] text-gray-500">Toplam Kar</p>
        </div>

        {/* Total Orders */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-[12px] font-medium text-gray-400">
              Ort: {formatPrice(summary.avgOrderAmount)}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {summary.totalOrders}
          </p>
          <p className="mt-1 text-[13px] text-gray-500">Toplam Siparis</p>
        </div>

        {/* Total Cost */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {formatPrice(summary.totalCost)}
          </p>
          <p className="mt-1 text-[13px] text-gray-500">Toplam Maliyet</p>
        </div>
      </div>

      {/* ── Retail / Wholesale / Refund Cards (3-col) ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Retail */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <Package className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-500">Perakende</p>
              <p className="text-lg font-bold text-gray-900">
                {formatPrice(summary.retailRevenue)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 border-t border-gray-50 pt-3">
            <ShoppingCart className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[12px] text-gray-500">
              {summary.retailCount} siparis
            </span>
          </div>
        </div>

        {/* Wholesale */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-500">Toptan</p>
              <p className="text-lg font-bold text-gray-900">
                {formatPrice(summary.wholesaleRevenue)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 border-t border-gray-50 pt-3">
            <ShoppingCart className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[12px] text-gray-500">
              {summary.wholesaleCount} siparis
            </span>
          </div>
        </div>

        {/* Refunds */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-500">Iade</p>
              <p className="text-lg font-bold text-red-600">
                {formatPrice(summary.refundedAmount)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 border-t border-gray-50 pt-3">
            <FileText className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[12px] text-gray-500">
              {summary.refundedCount} iade
            </span>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation (pill-style) ── */}
      <div className="flex items-center gap-1 rounded-2xl bg-gray-100/80 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}

      {/* Overview -- Daily Chart */}
      {activeTab === "overview" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">
                Gunluk Satis / Maliyet
              </h3>
              <p className="text-[12px] text-gray-500">
                Secilen donem icin gunluk gelir ve maliyet grafigi
              </p>
            </div>
          </div>

          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "short",
                    })
                  }
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={formatShortPrice}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)",
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [
                    formatPrice(Number(value)),
                    name === "revenue"
                      ? "Gelir"
                      : name === "cost"
                        ? "Maliyet"
                        : "Siparis",
                  ]}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString("tr-TR")
                  }
                />
                <Legend
                  formatter={(v) =>
                    v === "revenue"
                      ? "Gelir"
                      : v === "cost"
                        ? "Maliyet"
                        : "Siparis"
                  }
                />
                <Bar
                  dataKey="revenue"
                  fill="#7AC143"
                  name="revenue"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="cost"
                  fill="#ef4444"
                  name="cost"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-72 flex-col items-center justify-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                <BarChart3 className="h-7 w-7 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-400">
                  Veri bulunamadi
                </p>
                <p className="mt-0.5 text-[12px] text-gray-400">
                  Bu donem icin grafik verisi yok
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">
                En Cok Satan Urunler
              </h3>
              <p className="text-[12px] text-gray-500">
                Satis adedi, gelir ve kar marjina gore ilk 10 urun
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50/80">
                <tr>
                  <th className="px-6 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    #
                  </th>
                  <th className="px-6 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Urun
                  </th>
                  <th className="px-6 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Adet
                  </th>
                  <th className="px-6 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Satis
                  </th>
                  <th className="px-6 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Maliyet
                  </th>
                  <th className="px-6 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Kar
                  </th>
                  <th className="px-6 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Marj
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topProducts.map((p, idx) => (
                  <tr
                    key={idx}
                    className="transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-3.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-gray-900">
                      {p.name}
                    </td>
                    <td className="px-6 py-3.5 text-right text-gray-600">
                      {p.quantity}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-gray-900">
                      {formatPrice(p.revenue)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-gray-500">
                      {formatPrice(p.cost)}
                    </td>
                    <td
                      className={`px-6 py-3.5 text-right font-medium ${
                        p.profit >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {formatPrice(p.profit)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Badge
                        variant={
                          p.margin >= 30
                            ? "success"
                            : p.margin >= 15
                              ? "warning"
                              : "discount"
                        }
                      >
                        %{p.margin.toFixed(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                          <Package className="h-7 w-7 text-gray-300" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-400">
                            Urun verisi bulunamadi
                          </p>
                          <p className="mt-0.5 text-[12px] text-gray-400">
                            Bu donem icin satis verisi yok
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Layers className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">
                Kategori Bazli Satislar
              </h3>
              <p className="text-[12px] text-gray-500">
                Her kategori icin satis, maliyet ve kar analizi
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50/80">
                <tr>
                  <th className="px-6 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Adet
                  </th>
                  <th className="px-6 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Satis
                  </th>
                  <th className="px-6 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Maliyet
                  </th>
                  <th className="px-6 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Kar
                  </th>
                  <th className="px-6 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Kar Marji
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categoryStats.map((c, idx) => {
                  const profit = c.revenue - c.cost;
                  const margin =
                    c.revenue > 0 ? (profit / c.revenue) * 100 : 0;
                  return (
                    <tr
                      key={idx}
                      className="transition-colors hover:bg-gray-50/50"
                    >
                      <td className="px-6 py-3.5 font-medium text-gray-900">
                        {c.name}
                      </td>
                      <td className="px-6 py-3.5 text-right text-gray-600">
                        {c.quantity}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-gray-900">
                        {formatPrice(c.revenue)}
                      </td>
                      <td className="px-6 py-3.5 text-right text-gray-500">
                        {formatPrice(c.cost)}
                      </td>
                      <td
                        className={`px-6 py-3.5 text-right font-medium ${
                          profit >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {formatPrice(profit)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Badge
                          variant={
                            margin >= 30
                              ? "success"
                              : margin >= 15
                                ? "warning"
                                : "discount"
                          }
                        >
                          %{margin.toFixed(1)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {categoryStats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                          <Layers className="h-7 w-7 text-gray-300" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-400">
                            Kategori verisi bulunamadi
                          </p>
                          <p className="mt-0.5 text-[12px] text-gray-400">
                            Bu donem icin kategori verisi yok
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
