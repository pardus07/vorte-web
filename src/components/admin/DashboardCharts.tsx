"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  Area,
  AreaChart,
} from "recharts";

interface DailyData {
  date: string;
  revenue: number;
  orders: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface ComparisonData {
  retail: { revenue: number; count: number };
  wholesale: { revenue: number; count: number };
}

const COLORS = ["#7AC143", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

function formatK(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}

function formatPrice(value: number): string {
  return `₺${Number(value || 0).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPriceDetailed(value: number): string {
  return `₺${Number(value || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
}

const tooltipStyle = {
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
  fontSize: "12px",
};

export function SalesLineChart({ data }: { data: DailyData[] }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-gray-900">Satış Trendi</h3>
          <p className="mt-0.5 text-[11px] text-gray-400">Son 30 gün</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#7AC143]" />
            <span className="text-[11px] text-gray-400">Ciro</span>
          </div>
        </div>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7AC143" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#7AC143" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.getDate()}/${d.getMonth() + 1}`;
              }}
              interval={4}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickFormatter={formatK}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatPriceDetailed(Number(value || 0)), "Ciro"]}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) => {
                const d = new Date(String(label));
                return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#7AC143"
              strokeWidth={2}
              fill="url(#revenueGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#7AC143", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryPieChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-[14px] font-semibold text-gray-900">Ürün Bazlı Satış</h3>
        <div className="flex h-[260px] items-center justify-center text-[13px] text-gray-400">
          Henüz satış verisi yok
        </div>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-[14px] font-semibold text-gray-900">Ürün Bazlı Satış</h3>
      <p className="mt-0.5 text-[11px] text-gray-400">Toplam {formatPrice(total)}</p>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label={({ name, percent }: any) =>
                `${name || ""} ${((percent || 0) * 100).toFixed(0)}%`
              }
              labelLine={{ strokeWidth: 1, stroke: "#d1d5db" }}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => formatPriceDetailed(Number(value || 0))}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ComparisonBarChart({ data }: { data: ComparisonData }) {
  const chartData = [
    { name: "Perakende", revenue: data.retail.revenue, orders: data.retail.count },
    { name: "Toptan", revenue: data.wholesale.revenue, orders: data.wholesale.count },
  ];

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="text-[14px] font-semibold text-gray-900">Perakende vs Toptan</h3>
        <p className="mt-0.5 text-[11px] text-gray-400">Son 30 gün karşılaştırma</p>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickFormatter={formatK}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                name === "revenue" ? formatPriceDetailed(Number(value || 0)) : value,
                name === "revenue" ? "Ciro" : "Sipariş",
              ]}
            />
            <Legend
              formatter={(value: string) => (
                <span className="text-[12px] text-gray-500">
                  {value === "revenue" ? "Ciro (₺)" : "Sipariş"}
                </span>
              )}
            />
            <Bar dataKey="revenue" fill="#7AC143" radius={[6, 6, 0, 0]} />
            <Bar dataKey="orders" fill="#3B82F6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
