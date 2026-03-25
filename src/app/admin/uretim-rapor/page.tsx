"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FullProductionOrder {
  id: string;
  orderNumber: string;
  stage: string;
  priority: string;
  totalQuantity: number;
  targetDate: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  createdAt: string;
  items: { id: string; productName: string; totalQuantity: number }[];
}

interface QualityCheck {
  id: string;
  result: "PASSED" | "FAILED" | "CONDITIONAL";
  inspectedQuantity: number;
  defectQuantity: number;
  defectRate: number;
  inspectorNotes: string | null;
  createdAt: string;
  productionOrder: { orderNumber: string; stage: string };
}

interface MaterialStock {
  id: string;
  name: string;
  type: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  supplier: { name: string; email: string } | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STAGE_LABELS: Record<string, string> = {
  PENDING: "Beklemede",
  BOM_CALCULATED: "BOM Hazir",
  MATERIALS_ORDERED: "Malzeme Siparis",
  MATERIALS_RECEIVED: "Malzeme Teslim",
  IN_PRODUCTION: "Uretimde",
  QUALITY_CHECK: "Kalite Kontrol",
  PACKAGING_STAGE: "Paketleme",
  PROD_SHIPPED: "Kargoda",
  PROD_DELIVERED: "Teslim Edildi",
  PROD_CANCELLED: "Iptal",
};

const STAGE_COLORS: Record<string, string> = {
  PENDING: "bg-gray-400",
  BOM_CALCULATED: "bg-blue-500",
  MATERIALS_ORDERED: "bg-indigo-500",
  MATERIALS_RECEIVED: "bg-teal-500",
  IN_PRODUCTION: "bg-orange-500",
  QUALITY_CHECK: "bg-purple-500",
  PACKAGING_STAGE: "bg-cyan-500",
  PROD_SHIPPED: "bg-amber-500",
  PROD_DELIVERED: "bg-green-500",
  PROD_CANCELLED: "bg-red-500",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Dusuk",
  normal: "Normal",
  high: "Yuksek",
  urgent: "Acil",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-400",
  normal: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

const RESULT_LABELS: Record<string, string> = {
  PASSED: "Gecti",
  FAILED: "Kaldi",
  CONDITIONAL: "Sartli",
};

const RESULT_COLORS: Record<string, string> = {
  PASSED: "text-green-600 bg-green-50",
  FAILED: "text-red-600 bg-red-50",
  CONDITIONAL: "text-amber-600 bg-amber-50",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function UretimRaporPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<FullProductionOrder[]>([]);
  const [stageStats, setStageStats] = useState<Record<string, number>>({});
  const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([]);
  const [materials, setMaterials] = useState<MaterialStock[]>([]);
  const [materialAlerts, setMaterialAlerts] = useState(0);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [ordersRes, qualityRes, materialsRes] = await Promise.all([
          fetch("/api/admin/production-full?limit=50"),
          fetch("/api/admin/quality"),
          fetch("/api/admin/materials"),
        ]);

        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrders(data.orders || []);
          setStageStats(data.stats || {});
        }

        if (qualityRes.ok) {
          const data = await qualityRes.json();
          setQualityChecks(data.checks || []);
        }

        if (materialsRes.ok) {
          const data = await materialsRes.json();
          setMaterials(data.stocks || []);
          setMaterialAlerts(data.alerts || 0);
        }
      } catch (err) {
        console.error("Rapor verileri yuklenemedi:", err);
      }
      setLoading(false);
    }
    fetchAll();
  }, []);

  /* ---- Derived data ---- */

  const FINISHED_STAGES = ["PROD_DELIVERED", "PROD_CANCELLED"];

  const activeOrders = orders.filter(
    (o) => !FINISHED_STAGES.includes(o.stage),
  );

  const totalQuantity = orders.reduce((s, o) => s + (o.totalQuantity || 0), 0);

  // Average delivery days — only for completed orders with actualDelivery
  const completedOrders = orders.filter(
    (o) => o.stage === "PROD_DELIVERED" && o.actualDelivery,
  );
  const avgDeliveryDays =
    completedOrders.length > 0
      ? Math.round(
          completedOrders.reduce((sum, o) => {
            const start = new Date(o.createdAt).getTime();
            const end = new Date(o.actualDelivery!).getTime();
            return sum + (end - start) / (1000 * 60 * 60 * 24);
          }, 0) / completedOrders.length,
        )
      : 0;

  // Quality pass rate
  const totalChecks = qualityChecks.length;
  const passedChecks = qualityChecks.filter(
    (c) => c.result === "PASSED",
  ).length;
  const passRate =
    totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  // Stage distribution
  const stageEntries = Object.entries(stageStats).filter(
    ([, count]) => count > 0,
  );
  const maxStageCount = Math.max(...stageEntries.map(([, c]) => c), 1);

  // Priority breakdown
  const priorityCounts: Record<string, number> = {};
  for (const o of orders) {
    priorityCounts[o.priority] = (priorityCounts[o.priority] || 0) + 1;
  }
  const priorityEntries = Object.entries(priorityCounts).filter(
    ([, count]) => count > 0,
  );
  const maxPriorityCount = Math.max(
    ...priorityEntries.map(([, c]) => c),
    1,
  );

  // Recent quality checks — last 5
  const recentChecks = qualityChecks.slice(0, 5);

  // Low stock materials
  const lowStockMaterials = materials.filter(
    (m) => m.quantity <= m.minQuantity,
  );

  // Overdue orders
  const overdueOrders = orders.filter((o) => {
    if (FINISHED_STAGES.includes(o.stage)) return false;
    const target = o.estimatedDelivery || o.targetDate;
    if (!target) return false;
    return new Date(target) < new Date();
  });

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("tr-TR");
  };

  /* ---- Loading ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="rounded-2xl border border-gray-100 bg-white px-10 py-10 shadow-sm text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-3 text-[13px] text-gray-500">
            Rapor verileri yukleniyor...
          </p>
        </div>
      </div>
    );
  }

  /* ---- Render ---- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Uretim Raporlari
        </h1>
        <p className="mt-1 text-[13px] text-gray-500">
          Uretim sureci KPI&apos;lari ve ozet gorunumu
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Active Orders */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-[13px] text-gray-500">Aktif Siparisler</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {activeOrders.length}
          </p>
        </div>

        {/* Total Quantity */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <Package className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-[13px] text-gray-500">
              Toplam Uretim Adedi
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {totalQuantity.toLocaleString("tr-TR")}
          </p>
        </div>

        {/* Average Delivery */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-[13px] text-gray-500">
              Ort. Teslim Suresi
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {avgDeliveryDays > 0 ? `${avgDeliveryDays} gun` : "-"}
          </p>
        </div>

        {/* Quality Pass Rate */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-[13px] text-gray-500">
              Kalite Gecis Orani
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {totalChecks > 0 ? `%${passRate}` : "-"}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stage Distribution */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">
            Asama Dagilimi
          </h2>
          {stageEntries.length > 0 ? (
            <div className="space-y-3.5">
              {stageEntries.map(([stage, count]) => (
                <div key={stage}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {STAGE_LABELS[stage] || stage}
                    </span>
                    <span className="font-medium text-gray-900">
                      {count}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-3 rounded-full ${STAGE_COLORS[stage] || "bg-gray-400"}`}
                      style={{
                        width: `${(count / maxStageCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] text-gray-400">
              Henuz veri yok
            </p>
          )}
        </div>

        {/* Priority Breakdown */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">
            Oncelik Dagilimi
          </h2>
          {priorityEntries.length > 0 ? (
            <div className="space-y-3.5">
              {priorityEntries.map(([priority, count]) => (
                <div key={priority}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {PRIORITY_LABELS[priority] || priority}
                    </span>
                    <span className="font-medium text-gray-900">
                      {count}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-3 rounded-full ${PRIORITY_COLORS[priority] || "bg-gray-400"}`}
                      style={{
                        width: `${(count / maxPriorityCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] text-gray-400">
              Henuz veri yok
            </p>
          )}
        </div>
      </div>

      {/* Bottom Row — 3-column */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Quality Checks */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            Son Kalite Kontrolleri
          </h2>
          {recentChecks.length > 0 ? (
            <div className="space-y-2.5">
              {recentChecks.map((check) => (
                <div
                  key={check.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {check.productionOrder.orderNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {check.inspectedQuantity} adet kontrol &middot;{" "}
                      {formatDate(check.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RESULT_COLORS[check.result] || ""}`}
                  >
                    {RESULT_LABELS[check.result] || check.result}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] text-gray-400">
              Kalite kontrolu yok
            </p>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Dusuk Stok Uyarilari
            {materialAlerts > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                {materialAlerts}
              </span>
            )}
          </h2>
          {lowStockMaterials.length > 0 ? (
            <div className="space-y-2.5">
              {lowStockMaterials.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800">
                      {m.name}
                    </p>
                    <span className="text-xs font-medium text-red-600">
                      {m.quantity} / {m.minQuantity} {m.unit}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {m.type} {m.supplier ? `- ${m.supplier.name}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] text-gray-400">
              Stok seviyesi normal
            </p>
          )}
        </div>

        {/* Overdue Orders */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Geciken Siparisler
            {overdueOrders.length > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                {overdueOrders.length}
              </span>
            )}
          </h2>
          {overdueOrders.length > 0 ? (
            <div className="space-y-2.5">
              {overdueOrders.slice(0, 8).map((o) => {
                const target = o.estimatedDelivery || o.targetDate;
                const daysLate = target
                  ? Math.ceil(
                      (new Date().getTime() -
                        new Date(target).getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                  : 0;

                return (
                  <div
                    key={o.id}
                    className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800">
                        {o.orderNumber}
                      </p>
                      <span className="text-xs font-medium text-red-600">
                        {daysLate} gun gecikme
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {STAGE_LABELS[o.stage] || o.stage} &middot; Hedef:{" "}
                      {formatDate(target)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] text-gray-400">
              Geciken siparis yok
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
