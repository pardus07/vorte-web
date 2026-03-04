"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Factory,
  Save,
  Scissors,
  CheckCircle2,
  Package,
  ClipboardCheck,
  Timer,
  Trash2,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface ProductionOrderDetail {
  id: string;
  orderNumber: string;
  productId: string;
  product: {
    name: string;
    images: string[];
    basePrice: number;
    costPrice: number | null;
    variants: { color: string; size: string; stock: number }[];
  };
  variants: { color: string; size: string; quantity: number }[];
  totalQuantity: number;
  status: string;
  priority: string;
  startDate: string | null;
  targetDate: string;
  completedDate: string | null;
  materialCost: number | null;
  laborCost: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  logs: {
    id: string;
    fromStatus: string;
    toStatus: string;
    note: string | null;
    changedBy: string | null;
    createdAt: string;
  }[];
}

const STATUS_FLOW = ["planned", "cutting", "sewing", "quality", "packaging", "completed"] as const;
const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  planned: { label: "Planlanan", color: "bg-blue-100 text-blue-700 border-blue-300", icon: Timer },
  cutting: { label: "Kesim", color: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: Scissors },
  sewing: { label: "Dikim", color: "bg-orange-100 text-orange-700 border-orange-300", icon: Factory },
  quality: { label: "Kalite Kontrol", color: "bg-purple-100 text-purple-700 border-purple-300", icon: ClipboardCheck },
  packaging: { label: "Paketleme", color: "bg-cyan-100 text-cyan-700 border-cyan-300", icon: Package },
  completed: { label: "Tamamlandı", color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle2 },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "bg-gray-100 text-gray-600" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-600" },
  high: { label: "Yüksek", color: "bg-orange-100 text-orange-600" },
  urgent: { label: "Acil", color: "bg-red-100 text-red-600" },
};

export default function UretimDetayPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<ProductionOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [editMode, setEditMode] = useState(false);

  // Editable fields
  const [editData, setEditData] = useState({
    priority: "",
    targetDate: "",
    materialCost: "",
    laborCost: "",
    notes: "",
  });

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/admin/production/${id}`);
    if (res.ok) {
      const data = await res.json();
      setOrder(data);
      setEditData({
        priority: data.priority,
        targetDate: data.targetDate.split("T")[0],
        materialCost: data.materialCost?.toString() || "",
        laborCost: data.laborCost?.toString() || "",
        notes: data.notes || "",
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    const res = await fetch(`/api/admin/production/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, statusNote: statusNote || undefined }),
    });
    if (res.ok) {
      setStatusNote("");
      fetchOrder();
    }
    setSaving(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/production/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priority: editData.priority,
        targetDate: editData.targetDate,
        materialCost: editData.materialCost ? parseFloat(editData.materialCost) : null,
        laborCost: editData.laborCost ? parseFloat(editData.laborCost) : null,
        notes: editData.notes || null,
      }),
    });
    if (res.ok) {
      setEditMode(false);
      fetchOrder();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Bu üretim emrini silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`/api/admin/production/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/uretim");
    else {
      const data = await res.json();
      alert(data.error || "Silinemedi");
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatDateTime = (d: string) => {
    return new Date(d).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) return <div className="py-20 text-center text-gray-400">Yükleniyor...</div>;
  if (!order) return <div className="py-20 text-center text-gray-400">Üretim emri bulunamadı</div>;

  const statusCfg = STATUS_MAP[order.status];
  const priCfg = PRIORITY_MAP[order.priority];
  const currentIdx = STATUS_FLOW.indexOf(order.status as typeof STATUS_FLOW[number]);
  const nextStatus = currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
  const prevStatus = currentIdx > 0 ? STATUS_FLOW[currentIdx - 1] : null;
  const totalCost = (order.materialCost || 0) + (order.laborCost || 0);
  const unitCost = order.totalQuantity > 0 ? totalCost / order.totalQuantity : 0;
  const isOverdue = order.status !== "completed" && new Date(order.targetDate) < new Date();

  // Build variant matrix
  const uniqueColors = [...new Set(order.variants.map((v) => v.color))];
  const uniqueSizes = [...new Set(order.variants.map((v) => v.size))];
  const variantMap = new Map(order.variants.map((v) => [`${v.color}|${v.size}`, v.quantity]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/uretim" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${priCfg.color}`}>{priCfg.label}</span>
              {isOverdue && (
                <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  <AlertTriangle className="h-3 w-3" /> Gecikmiş
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">{order.product.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Düzenle
            </button>
          ) : (
            <>
              <button onClick={() => setEditMode(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                İptal
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-4 py-2 text-sm font-medium text-white hover:bg-[#6aad38] disabled:opacity-50">
                <Save className="h-4 w-4" /> Kaydet
              </button>
            </>
          )}
          {["planned", "completed"].includes(order.status) && (
            <button onClick={handleDelete} className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Status Progress */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-sm font-medium text-gray-500">Üretim Durumu</h3>
        <div className="flex items-center gap-1">
          {STATUS_FLOW.map((s, i) => {
            const sCfg = STATUS_MAP[s];
            const Icon = sCfg.icon;
            const isActive = i <= currentIdx;
            const isCurrent = s === order.status;
            return (
              <div key={s} className="flex flex-1 items-center">
                <div className={`flex flex-col items-center gap-1 ${i > 0 ? "flex-1" : ""}`}>
                  {i > 0 && (
                    <div className={`h-0.5 w-full ${isActive ? "bg-[#7AC143]" : "bg-gray-200"}`} />
                  )}
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isCurrent ? "bg-[#7AC143] text-white ring-4 ring-[#7AC143]/20" : isActive ? "bg-[#7AC143] text-white" : "bg-gray-200 text-gray-400"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`text-[10px] font-medium ${isCurrent ? "text-[#7AC143]" : isActive ? "text-gray-700" : "text-gray-400"}`}>
                    {sCfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Status change */}
        {order.status !== "completed" && (
          <div className="mt-4 flex items-center gap-3 border-t pt-4">
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              className="form-input flex-1"
              placeholder="Durum değişikliği notu (isteğe bağlı)"
            />
            {prevStatus && (
              <button
                onClick={() => handleStatusChange(prevStatus)}
                disabled={saving}
                className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                ← {STATUS_MAP[prevStatus].label}
              </button>
            )}
            {nextStatus && (
              <button
                onClick={() => handleStatusChange(nextStatus)}
                disabled={saving}
                className="rounded-lg bg-[#7AC143] px-4 py-2 text-sm font-medium text-white hover:bg-[#6aad38] disabled:opacity-50"
              >
                {STATUS_MAP[nextStatus].label} →
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Variant Matrix */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-sm font-medium text-gray-500">Varyasyon Detayları</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Renk</th>
                    {uniqueSizes.map((size) => (
                      <th key={size} className="px-3 py-2 text-center text-xs font-medium text-gray-500">{size}</th>
                    ))}
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueColors.map((color) => {
                    const rowTotal = uniqueSizes.reduce((s, size) => s + (variantMap.get(`${color}|${size}`) || 0), 0);
                    return (
                      <tr key={color} className="border-b">
                        <td className="px-3 py-2 font-medium text-gray-700">{color}</td>
                        {uniqueSizes.map((size) => {
                          const qty = variantMap.get(`${color}|${size}`);
                          return (
                            <td key={size} className="px-3 py-2 text-center">
                              {qty ? <span className="font-medium">{qty}</span> : <span className="text-gray-300">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right font-medium text-gray-600">{rowTotal}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700">Toplam</td>
                    {uniqueSizes.map((size) => {
                      const colTotal = uniqueColors.reduce((s, color) => s + (variantMap.get(`${color}|${size}`) || 0), 0);
                      return <td key={size} className="px-3 py-2 text-center font-medium">{colTotal || ""}</td>;
                    })}
                    <td className="px-3 py-2 text-right font-bold text-[#7AC143]">{order.totalQuantity}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-sm font-medium text-gray-500">Durum Geçmişi</h3>
            <div className="space-y-4">
              {order.logs.map((log, i) => {
                const toCfg = STATUS_MAP[log.toStatus];
                const ToIcon = toCfg?.icon || Clock;
                return (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${i === 0 ? "bg-[#7AC143] text-white" : "bg-gray-200 text-gray-500"}`}>
                        <ToIcon className="h-4 w-4" />
                      </div>
                      {i < order.logs.length - 1 && <div className="h-full w-0.5 bg-gray-200" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {log.fromStatus ? `${STATUS_MAP[log.fromStatus]?.label || log.fromStatus} → ` : ""}
                          {toCfg?.label || log.toStatus}
                        </span>
                        <span className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</span>
                      </div>
                      {log.changedBy && <p className="text-xs text-gray-400">{log.changedBy}</p>}
                      {log.note && <p className="mt-1 text-sm text-gray-600">{log.note}</p>}
                    </div>
                  </div>
                );
              })}
              {order.logs.length === 0 && (
                <p className="text-sm text-gray-400">Henüz durum değişikliği yok</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Info & Cost */}
        <div className="space-y-6">
          {/* Order Info */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-sm font-medium text-gray-500">Sipariş Bilgileri</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Üretim No</dt>
                <dd className="font-medium text-gray-900">{order.orderNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Ürün</dt>
                <dd className="font-medium text-gray-900">{order.product.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Toplam Adet</dt>
                <dd className="font-medium text-gray-900">{order.totalQuantity.toLocaleString("tr-TR")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Öncelik</dt>
                <dd>
                  {editMode ? (
                    <select
                      value={editData.priority}
                      onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                      className="form-input text-xs"
                    >
                      <option value="low">Düşük</option>
                      <option value="normal">Normal</option>
                      <option value="high">Yüksek</option>
                      <option value="urgent">Acil</option>
                    </select>
                  ) : (
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${priCfg.color}`}>{priCfg.label}</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Oluşturulma</dt>
                <dd className="text-gray-700">{formatDate(order.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Başlangıç</dt>
                <dd className="text-gray-700">{formatDate(order.startDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Hedef Tarih</dt>
                <dd>
                  {editMode ? (
                    <input
                      type="date"
                      value={editData.targetDate}
                      onChange={(e) => setEditData({ ...editData, targetDate: e.target.value })}
                      className="form-input text-xs"
                    />
                  ) : (
                    <span className={isOverdue ? "font-medium text-red-500" : "text-gray-700"}>
                      {formatDate(order.targetDate)}
                    </span>
                  )}
                </dd>
              </div>
              {order.completedDate && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Tamamlanma</dt>
                  <dd className="text-green-600 font-medium">{formatDate(order.completedDate)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Cost Summary */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-sm font-medium text-gray-500">Maliyet Özeti</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Malzeme</dt>
                <dd>
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editData.materialCost}
                      onChange={(e) => setEditData({ ...editData, materialCost: e.target.value })}
                      className="form-input w-24 text-right text-xs"
                      placeholder="0.00"
                    />
                  ) : (
                    <span className="font-medium text-gray-900">
                      {order.materialCost ? `₺${order.materialCost.toLocaleString("tr-TR")}` : "-"}
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">İşçilik</dt>
                <dd>
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editData.laborCost}
                      onChange={(e) => setEditData({ ...editData, laborCost: e.target.value })}
                      className="form-input w-24 text-right text-xs"
                      placeholder="0.00"
                    />
                  ) : (
                    <span className="font-medium text-gray-900">
                      {order.laborCost ? `₺${order.laborCost.toLocaleString("tr-TR")}` : "-"}
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t pt-3">
                <dt className="font-medium text-gray-700">Toplam</dt>
                <dd className="font-bold text-gray-900">
                  {totalCost > 0 ? `₺${totalCost.toLocaleString("tr-TR")}` : "-"}
                </dd>
              </div>
              {totalCost > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Birim Maliyet</dt>
                  <dd className="text-gray-700">₺{unitCost.toFixed(2)}/adet</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Notes */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-sm font-medium text-gray-500">Notlar</h3>
            {editMode ? (
              <textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                className="form-input w-full text-sm"
                rows={4}
                placeholder="Üretim notları..."
              />
            ) : (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {order.notes || "Not eklenmemiş."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
