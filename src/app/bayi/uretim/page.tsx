"use client";

import { useEffect, useState } from "react";
import {
  Factory,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type StageHistoryEntry = {
  stage: string;
  date: string;
  note?: string;
};

type TrackingEntry = {
  stage: string;
  progress: number;
  notes: string;
  createdAt: string;
};

type QualityCheck = {
  result: string;
  passRate: number;
  notes: string;
  createdAt: string;
};

type ProductionItem = {
  id: string;
  sku: string;
  color: string;
  sizeBreakdown: Record<string, number>;
  totalQuantity: number;
};

type ProductionOrder = {
  id: string;
  orderNumber: string;
  stage: string;
  priority: string;
  stageHistory: StageHistoryEntry[];
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: ProductionItem[];
  tracking: TrackingEntry[];
  qualityChecks: QualityCheck[];
};

const STAGES = [
  { key: "PENDING", label: "Beklemede", icon: Clock, color: "text-gray-400" },
  { key: "BOM_CALCULATED", label: "Malzeme Planlandı", icon: CheckCircle2, color: "text-blue-500" },
  { key: "MATERIALS_ORDERED", label: "Malzeme Sipariş", icon: Package, color: "text-indigo-500" },
  { key: "MATERIALS_RECEIVED", label: "Malzeme Teslim", icon: CheckCircle2, color: "text-cyan-500" },
  { key: "IN_PRODUCTION", label: "Üretimde", icon: Factory, color: "text-amber-500" },
  { key: "QUALITY_CHECK", label: "Kalite Kontrol", icon: CheckCircle2, color: "text-orange-500" },
  { key: "PACKAGING_STAGE", label: "Paketleme", icon: Package, color: "text-purple-500" },
  { key: "PROD_SHIPPED", label: "Kargoda", icon: Truck, color: "text-green-500" },
  { key: "PROD_DELIVERED", label: "Teslim Edildi", icon: CheckCircle2, color: "text-green-600" },
];

const STAGE_INDEX: Record<string, number> = {};
STAGES.forEach((s, i) => (STAGE_INDEX[s.key] = i));

function getProgress(stage: string): number {
  const map: Record<string, number> = {
    PENDING: 0, BOM_CALCULATED: 12, MATERIALS_ORDERED: 25, MATERIALS_RECEIVED: 37,
    IN_PRODUCTION: 50, QUALITY_CHECK: 70, PACKAGING_STAGE: 82, PROD_SHIPPED: 93,
    PROD_DELIVERED: 100, PROD_CANCELLED: 0,
  };
  return map[stage] ?? 0;
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
}

function formatDateTime(d: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

function StageBadge({ stage }: { stage: string }) {
  const s = STAGES.find((x) => x.key === stage);
  if (!s) return <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">İptal</span>;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium ${s.color}`}>
      <s.icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

export default function DealerProductionPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dealer/production")
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Üretim Takip</h1>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg border bg-white p-6">
            <div className="h-4 w-48 rounded bg-gray-200" />
            <div className="mt-4 h-3 w-full rounded bg-gray-100" />
            <div className="mt-2 h-3 w-2/3 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Üretim Takip</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border bg-white py-16">
          <Factory className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">Henüz üretim siparişiniz bulunmuyor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Üretim Takip</h1>
      <p className="text-sm text-gray-500">Üretim siparişlerinizin durumunu buradan takip edebilirsiniz.</p>

      {orders.map((order) => {
        const progress = getProgress(order.stage);
        const isExpanded = expandedId === order.id;
        const isCancelled = order.stage === "PROD_CANCELLED";
        const isDelivered = order.stage === "PROD_DELIVERED";

        return (
          <div key={order.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
            {/* Header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : order.id)}
              className="flex w-full items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isCancelled ? "bg-red-50" : isDelivered ? "bg-green-50" : "bg-amber-50"}`}>
                  <Factory className={`h-5 w-5 ${isCancelled ? "text-red-500" : isDelivered ? "text-green-500" : "text-amber-500"}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">#{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(order.createdAt)}
                    {order.estimatedDelivery && !isDelivered && !isCancelled && (
                      <> · Tahmini: <span className="font-medium text-amber-600">{formatDate(order.estimatedDelivery)}</span></>
                    )}
                    {order.actualDelivery && (
                      <> · Teslim: <span className="font-medium text-green-600">{formatDate(order.actualDelivery)}</span></>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StageBadge stage={order.stage} />
                {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </div>
            </button>

            {/* Progress bar */}
            <div className="px-5 pb-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isCancelled ? "bg-red-400" : isDelivered ? "bg-green-500" : "bg-amber-400"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                <span>Başlangıç</span>
                <span>%{progress}</span>
                <span>Teslim</span>
              </div>
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="border-t bg-gray-50 p-5 space-y-5">
                {/* Stage Timeline */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Aşama Durumu</h3>
                  <div className="flex flex-wrap gap-1">
                    {STAGES.map((s, idx) => {
                      const currentIdx = STAGE_INDEX[order.stage] ?? -1;
                      const isPast = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;
                      return (
                        <div key={s.key} className="flex items-center">
                          <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
                            isCurrent
                              ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
                              : isPast
                              ? "bg-green-50 text-green-600"
                              : "bg-gray-100 text-gray-400"
                          }`}>
                            <s.icon className="h-3 w-3" />
                            <span className="hidden sm:inline">{s.label}</span>
                          </div>
                          {idx < STAGES.length - 1 && (
                            <div className={`mx-0.5 h-0.5 w-3 ${isPast ? "bg-green-300" : "bg-gray-200"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Items */}
                {order.items.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Ürünler</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-gray-500">
                            <th className="py-2 text-left">SKU</th>
                            <th className="py-2 text-left">Renk</th>
                            <th className="py-2 text-center">S</th>
                            <th className="py-2 text-center">M</th>
                            <th className="py-2 text-center">L</th>
                            <th className="py-2 text-center">XL</th>
                            <th className="py-2 text-center">XXL</th>
                            <th className="py-2 text-right">Toplam</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => {
                            const sizes = (item.sizeBreakdown || {}) as Record<string, number>;
                            return (
                              <tr key={item.id} className="border-b last:border-0">
                                <td className="py-2 font-medium text-gray-900">{item.sku}</td>
                                <td className="py-2 text-gray-600">{item.color}</td>
                                {["S", "M", "L", "XL", "XXL"].map((sz) => (
                                  <td key={sz} className="py-2 text-center text-gray-600">{sizes[sz] || "-"}</td>
                                ))}
                                <td className="py-2 text-right font-semibold">{item.totalQuantity}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Stage History Timeline */}
                {order.stageHistory && (order.stageHistory as StageHistoryEntry[]).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Geçmiş</h3>
                    <div className="space-y-2">
                      {[...(order.stageHistory as StageHistoryEntry[])].reverse().map((entry, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-white border-2 border-gray-300">
                            <div className="h-2 w-2 rounded-full bg-gray-400" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-700">
                              <StageBadge stage={entry.stage} />
                            </p>
                            {entry.note && <p className="text-xs text-gray-500 mt-0.5">{entry.note}</p>}
                            <p className="text-[10px] text-gray-400">{formatDateTime(entry.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quality Checks */}
                {order.qualityChecks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Kalite Kontrol</h3>
                    {order.qualityChecks.map((qc, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded border bg-white p-3">
                        {qc.result === "PASSED" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{qc.result === "PASSED" ? "Geçti" : qc.result === "FAILED" ? "Kaldı" : "Kısmi"} — %{qc.passRate}</p>
                          {qc.notes && <p className="text-xs text-gray-500">{qc.notes}</p>}
                          <p className="text-[10px] text-gray-400">{formatDateTime(qc.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {order.notes && (
                  <div className="rounded border-l-4 border-amber-300 bg-amber-50 p-3">
                    <p className="text-xs font-medium text-amber-700">Not</p>
                    <p className="text-sm text-amber-600">{order.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
