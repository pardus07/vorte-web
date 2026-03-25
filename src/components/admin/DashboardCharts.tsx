"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart,
  Cell,
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

function formatK(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}

function formatPrice(value: number): string {
  return `₺${Number(value || 0).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPriceDetailed(value: number): string {
  return `₺${Number(value || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
}

const tooltipStyle: React.CSSProperties = {
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px -4px rgb(0 0 0 / 0.08)",
  fontSize: "12px",
  padding: "10px 14px",
  background: "#fff",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = new Date(String(label));
  const dateStr = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  return (
    <div style={tooltipStyle}>
      <p className="mb-1.5 text-[11px] font-medium text-gray-500">{dateStr}</p>
      {payload.map((p: { dataKey: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[12px]">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.dataKey === "revenue" ? "Ciro" : "Sipariş"}</span>
          <span className="ml-auto font-semibold text-gray-800">
            {p.dataKey === "revenue" ? formatPriceDetailed(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SalesLineChart({ data }: { data: DailyData[] }) {
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = data.reduce((s, d) => s + d.orders, 0);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">Satış Trendi</h3>
          <p className="mt-0.5 text-[12px] text-gray-400">Son 30 gün performans</p>
        </div>
        <div className="flex gap-5">
          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Toplam Ciro</p>
            <p className="mt-0.5 text-[18px] font-bold text-gray-900">{formatPrice(totalRevenue)}</p>
          </div>
          <div className="border-l border-gray-100 pl-5 text-right">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Sipariş</p>
            <p className="mt-0.5 text-[18px] font-bold text-gray-900">{totalOrders}</p>
          </div>
        </div>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7AC143" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#7AC143" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
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
              yAxisId="revenue"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickFormatter={formatK}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <YAxis
              yAxisId="orders"
              orientation="right"
              tick={{ fontSize: 10, fill: "#93c5fd" }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              stroke="#7AC143"
              strokeWidth={2.5}
              fill="url(#revenueGrad)"
              dot={false}
              activeDot={{ r: 5, fill: "#7AC143", stroke: "#fff", strokeWidth: 2.5 }}
            />
            <Area
              yAxisId="orders"
              type="monotone"
              dataKey="orders"
              stroke="#93c5fd"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="url(#ordersGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#3B82F6", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-5 border-t border-gray-50 pt-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#7AC143]" />
          <span className="text-[11px] text-gray-400">Ciro</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-[2px] w-4 rounded-full bg-[#93c5fd]" style={{ borderTop: "2px dashed #93c5fd" }} />
          <span className="text-[11px] text-gray-400">Sipariş adedi</span>
        </div>
      </div>
    </div>
  );
}

const BAR_COLORS = [
  "#7AC143", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CategoryTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={tooltipStyle}>
      <p className="mb-1 text-[12px] font-medium text-gray-800">{d.payload.name}</p>
      <p className="text-[12px] text-gray-600">{formatPriceDetailed(d.value)}</p>
    </div>
  );
}

export function CategoryPieChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-[15px] font-semibold text-gray-900">Ürün Bazlı Satış</h3>
        <div className="flex h-[280px] items-center justify-center text-[13px] text-gray-400">
          Henüz satış verisi yok
        </div>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const chartWidth = Math.max(sorted.length * 52, 400);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">Ürün Satışları</h3>
          <p className="mt-0.5 text-[12px] text-gray-400">
            {sorted.length} ürün · Toplam {formatPrice(total)}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div style={{ width: chartWidth, height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sorted} margin={{ top: 5, right: 10, bottom: 80, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                interval={0}
                angle={-45}
                textAnchor="end"
                axisLine={false}
                tickLine={false}
                height={80}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickFormatter={formatK}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip content={<CategoryTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {sorted.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function ComparisonBarChart({ data }: { data: ComparisonData }) {
  const chartData = [
    { name: "Perakende", revenue: data.retail.revenue, orders: data.retail.count },
    { name: "Toptan", revenue: data.wholesale.revenue, orders: data.wholesale.count },
  ];
  const totalRevenue = data.retail.revenue + data.wholesale.revenue;
  const retailPct = totalRevenue > 0 ? ((data.retail.revenue / totalRevenue) * 100).toFixed(0) : "0";
  const wholesalePct = totalRevenue > 0 ? ((data.wholesale.revenue / totalRevenue) * 100).toFixed(0) : "0";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-[15px] font-semibold text-gray-900">Perakende vs Toptan</h3>
        <p className="mt-0.5 text-[12px] text-gray-400">Son 30 gün karşılaştırma</p>
      </div>

      {/* Visual summary */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-blue-50/60 p-3.5">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-[11px] font-medium text-blue-700">Perakende</span>
          </div>
          <p className="mt-1.5 text-[18px] font-bold text-blue-900">{formatPrice(data.retail.revenue)}</p>
          <p className="text-[11px] text-blue-500">{data.retail.count} sipariş · %{retailPct}</p>
        </div>
        <div className="rounded-xl bg-emerald-50/60 p-3.5">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-medium text-emerald-700">Toptan</span>
          </div>
          <p className="mt-1.5 text-[18px] font-bold text-emerald-900">{formatPrice(data.wholesale.revenue)}</p>
          <p className="text-[11px] text-emerald-500">{data.wholesale.count} sipariş · %{wholesalePct}</p>
        </div>
      </div>

      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="35%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
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
            <Bar dataKey="revenue" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            <Bar dataKey="orders" fill="#7AC143" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
