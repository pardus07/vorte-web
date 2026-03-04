"use client";

import {
  LineChart,
  Line,
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
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

export function SalesLineChart({ data }: { data: DailyData[] }) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Son 30 Gün Satış</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.getDate()}/${d.getMonth() + 1}`;
              }}
              interval={4}
            />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={formatK} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`₺${Number(value || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`, "Ciro"]}
              labelFormatter={(label: any) => {
                const d = new Date(String(label));
                return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#7AC143"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryPieChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Ürün Bazlı Satış</h3>
        <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
          Henüz satış verisi yok
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Ürün Bazlı Satış</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label={({ name, percent }: any) =>
                `${name || ""} (${((percent || 0) * 100).toFixed(0)}%)`
              }
              labelLine={{ strokeWidth: 1 }}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip formatter={(value: any) => `₺${Number(value || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`} />
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
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Perakende vs Toptan (30 gün)</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={formatK} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip formatter={(value: any, name: any) => [
              name === "revenue" ? `₺${Number(value || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : value,
              name === "revenue" ? "Ciro" : "Sipariş",
            ]} />
            <Legend formatter={(value: string) => (value === "revenue" ? "Ciro (₺)" : "Sipariş Adet")} />
            <Bar dataKey="revenue" fill="#7AC143" radius={[4, 4, 0, 0]} />
            <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
