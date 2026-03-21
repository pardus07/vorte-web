"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Calculator,
  ShoppingCart,
  PackageCheck,
  Factory,
  CheckSquare,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Save,
  Trash2,
  RefreshCw,
  Send,
  ClipboardList,
} from "lucide-react";

/* ─── Types ─── */
interface OrderItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  color: string;
  sizeS: number; sizeM: number; sizeL: number; sizeXL: number; sizeXXL: number;
  totalQuantity: number;
}

interface BOMData {
  id: string;
  totalFabricKg: number;
  totalElasticM: number;
  totalThreadM: number;
  totalLabels: number;
  totalPackaging: number;
  totalWeightKg: number;
  items: any[];
  summary: any;
}

interface TrackingEntry {
  id: string;
  stage: string;
  progress: number;
  notes: string | null;
  createdAt: string;
}

interface QualityCheck {
  id: string;
  inspectedQuantity: number;
  passedQuantity: number | null;
  defectQuantity: number;
  defectRate: number | null;
  result: string;
  inspectorNotes: string | null;
  createdAt: string;
}

interface SupplierOrder {
  id: string;
  supplier: { name: string };
  materials: any; // JSON array
  totalAmount: string | null;
  sentAt: string | null;
  confirmedAt: string | null;
  expectedDelivery: string | null;
  deliveredAt: string | null;
  emailSent: boolean;
}

interface StageHistoryEntry {
  stage: string;
  date: string;
  note?: string;
  changedBy?: string;
}

interface FullOrder {
  id: string;
  orderNumber: string;
  stage: string;
  priority: string;
  totalQuantity: number;
  targetDate: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  notes: string | null;
  stageHistory: StageHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  dealerOrderId: string | null;
  dealerId: string | null;
  items: OrderItem[];
  bom: BOMData | null;
  tracking: TrackingEntry[];
  qualityChecks: QualityCheck[];
  supplierOrders: SupplierOrder[];
}

/* ─── Constants ─── */
const STAGE_FLOW = [
  "PENDING", "BOM_CALCULATED", "MATERIALS_ORDERED", "MATERIALS_RECEIVED",
  "IN_PRODUCTION", "QUALITY_CHECK", "PACKAGING_STAGE", "PROD_SHIPPED",
  "PROD_DELIVERED",
] as const;

const STAGE_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: "Beklemede", color: "bg-gray-100 text-gray-700", icon: Clock },
  BOM_CALCULATED: { label: "BOM Hazır", color: "bg-blue-100 text-blue-700", icon: Calculator },
  MATERIALS_ORDERED: { label: "Malzeme Sipariş", color: "bg-indigo-100 text-indigo-700", icon: ShoppingCart },
  MATERIALS_RECEIVED: { label: "Malzeme Teslim", color: "bg-teal-100 text-teal-700", icon: PackageCheck },
  IN_PRODUCTION: { label: "Üretimde", color: "bg-orange-100 text-orange-700", icon: Factory },
  QUALITY_CHECK: { label: "Kalite Kontrol", color: "bg-purple-100 text-purple-700", icon: CheckSquare },
  PACKAGING_STAGE: { label: "Paketleme", color: "bg-cyan-100 text-cyan-700", icon: Package },
  PROD_SHIPPED: { label: "Kargoda", color: "bg-amber-100 text-amber-700", icon: Truck },
  PROD_DELIVERED: { label: "Teslim Edildi", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  PROD_CANCELLED: { label: "İptal", color: "bg-red-100 text-red-700", icon: XCircle },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "bg-gray-100 text-gray-600" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-600" },
  high: { label: "Yüksek", color: "bg-orange-100 text-orange-600" },
  urgent: { label: "Acil", color: "bg-red-100 text-red-600" },
};

const QUALITY_RESULT_MAP: Record<string, { label: string; color: string }> = {
  PASSED: { label: "Geçti", color: "bg-green-100 text-green-700" },
  FAILED: { label: "Kaldı", color: "bg-red-100 text-red-700" },
  PARTIAL: { label: "Kısmi", color: "bg-yellow-100 text-yellow-700" },
};

/* ─── Helpers ─── */
const formatDate = (d: string | null) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("tr-TR");
};

const formatDateTime = (d: string) =>
  new Date(d).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

/* ─── Component ─── */
export default function UretimDetayPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [bomLoading, setBomLoading] = useState(false);
  const [editData, setEditData] = useState({ priority: "", targetDate: "", notes: "" });

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/admin/production-full/${id}`);
    if (res.ok) {
      const data = await res.json();
      // totalQuantity alanı modelde yok, items'tan hesapla
      if (!data.totalQuantity && data.items?.length) {
        data.totalQuantity = data.items.reduce((s: number, i: { totalQuantity: number }) => s + i.totalQuantity, 0);
      }
      setOrder(data);
      setEditData({
        priority: data.priority,
        targetDate: data.targetDate?.split("T")[0] || "",
        notes: data.notes || "",
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  /* ─── Actions ─── */
  const handleStageChange = async (newStage: string) => {
    setSaving(true);
    const res = await fetch(`/api/admin/production-full/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage, note: statusNote || undefined }),
    });
    if (res.ok) { setStatusNote(""); fetchOrder(); }
    else { const d = await res.json(); alert(d.error || "Hata"); }
    setSaving(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/production-full/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priority: editData.priority,
        targetDate: editData.targetDate,
        notes: editData.notes || null,
      }),
    });
    if (res.ok) { setEditMode(false); fetchOrder(); }
    setSaving(false);
  };

  const handleRecalcBOM = async () => {
    setBomLoading(true);
    const res = await fetch(`/api/admin/production-full/${id}/bom`, { method: "POST" });
    if (res.ok) fetchOrder();
    else { const d = await res.json(); alert(d.error || "BOM hesaplanamadı"); }
    setBomLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Siparişi silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`/api/admin/production-full/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/uretim");
    else { const d = await res.json(); alert(d.error || "Silinemedi"); }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Yükleniyor...</div>;
  if (!order) return <div className="py-20 text-center text-gray-400">Üretim siparişi bulunamadı</div>;

  const stageCfg = STAGE_MAP[order.stage] || STAGE_MAP.PENDING;
  const priCfg = PRIORITY_MAP[order.priority] || PRIORITY_MAP.normal;
  const currentIdx = STAGE_FLOW.indexOf(order.stage as any);
  const nextStage = currentIdx >= 0 && currentIdx < STAGE_FLOW.length - 1 ? STAGE_FLOW[currentIdx + 1] : null;
  const prevStage = currentIdx > 0 ? STAGE_FLOW[currentIdx - 1] : null;
  const isOverdue = !["PROD_DELIVERED", "PROD_CANCELLED"].includes(order.stage) &&
    (order.estimatedDelivery || order.targetDate) &&
    new Date(order.estimatedDelivery || order.targetDate!) < new Date();

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/uretim" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${stageCfg.color}`}>{stageCfg.label}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${priCfg.color}`}>{priCfg.label}</span>
              {isOverdue && (
                <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  <AlertTriangle className="h-3 w-3" /> Gecikmiş
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {order.totalQuantity.toLocaleString("tr-TR")} adet · Oluşturulma: {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <button onClick={() => setEditMode(true)} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Düzenle</button>
          ) : (
            <>
              <button onClick={() => setEditMode(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-4 py-2 text-sm font-medium text-white hover:bg-[#6aad38] disabled:opacity-50">
                <Save className="h-4 w-4" /> Kaydet
              </button>
            </>
          )}
          {["PENDING", "PROD_CANCELLED"].includes(order.stage) && (
            <button onClick={handleDelete} className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Stage Progress ─── */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-sm font-medium text-gray-500">Üretim Aşaması</h3>
        <div className="flex items-center gap-0.5 overflow-x-auto pb-2">
          {STAGE_FLOW.map((s, i) => {
            const sCfg = STAGE_MAP[s];
            const Icon = sCfg.icon;
            const isActive = i <= currentIdx;
            const isCurrent = s === order.stage;
            return (
              <div key={s} className="flex flex-1 items-center min-w-[80px]">
                {i > 0 && <div className={`h-0.5 w-full ${isActive ? "bg-[#7AC143]" : "bg-gray-200"}`} />}
                <div className="flex flex-col items-center gap-1">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isCurrent ? "bg-[#7AC143] text-white ring-4 ring-[#7AC143]/20"
                    : isActive ? "bg-[#7AC143] text-white"
                    : "bg-gray-200 text-gray-400"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`text-[10px] font-medium text-center whitespace-nowrap ${
                    isCurrent ? "text-[#7AC143]" : isActive ? "text-gray-700" : "text-gray-400"
                  }`}>
                    {sCfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stage change controls */}
        {!["PROD_DELIVERED", "PROD_CANCELLED"].includes(order.stage) && (
          <div className="mt-4 flex items-center gap-3 border-t pt-4">
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              className="form-input flex-1"
              placeholder="Durum değişikliği notu (isteğe bağlı)"
            />
            {prevStage && (
              <button onClick={() => handleStageChange(prevStage)} disabled={saving}
                className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                ← {STAGE_MAP[prevStage].label}
              </button>
            )}
            {nextStage && (
              <button onClick={() => handleStageChange(nextStage)} disabled={saving}
                className="rounded-lg bg-[#7AC143] px-4 py-2 text-sm font-medium text-white hover:bg-[#6aad38] disabled:opacity-50">
                {STAGE_MAP[nextStage].label} →
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Action Buttons ─── */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleRecalcBOM} disabled={bomLoading}
          className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {bomLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          BOM {order.bom ? "Yeniden Hesapla" : "Hesapla"}
        </button>
        {["BOM_CALCULATED", "PENDING"].includes(order.stage) && (
          <Link href={`/admin/tedarikciler`}
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Send className="h-4 w-4" /> Tedarikçiye Sipariş Ver
          </Link>
        )}
        {order.stage === "QUALITY_CHECK" && (
          <Link href={`/admin/kalite`}
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <ClipboardList className="h-4 w-4" /> Kalite Kontrol Ekle
          </Link>
        )}
        {order.stage === "PROD_CANCELLED" ? null : order.stage !== "PROD_DELIVERED" && (
          <button onClick={() => handleStageChange("PROD_CANCELLED")}
            className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50">
            <XCircle className="h-4 w-4" /> İptal Et
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ─── Left Column ─── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Items Table */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-sm font-medium text-gray-500">Ürün Kalemleri ({order.items.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Ürün</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Renk</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">S</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">M</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">L</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">XL</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">XXL</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-3 py-2 font-medium text-gray-700">{item.productName}</td>
                      <td className="px-3 py-2 text-gray-500">{item.sku}</td>
                      <td className="px-3 py-2 text-gray-600">{item.color}</td>
                      <td className="px-3 py-2 text-center">{item.sizeS || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-center">{item.sizeM || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-center">{item.sizeL || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-center">{item.sizeXL || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-center">{item.sizeXXL || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-right font-bold text-[#7AC143]">{item.totalQuantity}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={8} className="px-3 py-2 font-medium text-gray-700">Genel Toplam</td>
                    <td className="px-3 py-2 text-right font-bold text-[#7AC143]">{order.totalQuantity}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* BOM Table */}
          <div className="rounded-lg border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">BOM — Malzeme Listesi</h3>
              {order.bom && (
                <span className="text-xs text-gray-400">Hesaplandı: {formatDateTime(order.bom.id ? order.createdAt : order.createdAt)}</span>
              )}
            </div>
            {order.bom ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <div className="rounded-lg bg-blue-50 p-3 text-center">
                    <p className="text-xs text-blue-600">Kumaş</p>
                    <p className="mt-1 text-lg font-bold text-blue-800">{order.bom.totalFabricKg.toFixed(2)} kg</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-3 text-center">
                    <p className="text-xs text-purple-600">Lastik</p>
                    <p className="mt-1 text-lg font-bold text-purple-800">{order.bom.totalElasticM.toFixed(1)} m</p>
                  </div>
                  <div className="rounded-lg bg-orange-50 p-3 text-center">
                    <p className="text-xs text-orange-600">İplik</p>
                    <p className="mt-1 text-lg font-bold text-orange-800">{order.bom.totalThreadM.toFixed(1)} m</p>
                  </div>
                  <div className="rounded-lg bg-teal-50 p-3 text-center">
                    <p className="text-xs text-teal-600">Etiket</p>
                    <p className="mt-1 text-lg font-bold text-teal-800">{order.bom.totalLabels}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 text-center">
                    <p className="text-xs text-amber-600">Toplam Ağırlık</p>
                    <p className="mt-1 text-lg font-bold text-amber-800">{order.bom?.totalWeightKg?.toFixed(2) ?? "—"} kg</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed p-8 text-center">
                <Calculator className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-400">BOM henüz hesaplanmadı</p>
                <button onClick={handleRecalcBOM} disabled={bomLoading}
                  className="mt-3 rounded-lg bg-[#7AC143] px-4 py-2 text-sm font-medium text-white hover:bg-[#6aad38] disabled:opacity-50">
                  {bomLoading ? "Hesaplanıyor..." : "BOM Hesapla"}
                </button>
              </div>
            )}
          </div>

          {/* Supplier Orders */}
          {order.supplierOrders.length > 0 && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-4 text-sm font-medium text-gray-500">Tedarikçi Siparişleri ({order.supplierOrders.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Tedarikçi</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Malzeme</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Miktar</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Tutar</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Durum</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Sipariş</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Teslim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.supplierOrders.map(so => {
                      const mats = Array.isArray(so.materials) ? so.materials : [];
                      const firstMat = mats[0];
                      const matName = firstMat?.name || "-";
                      const matQty = firstMat ? `${firstMat.quantity} ${firstMat.unit || ""}` : "-";
                      const status = so.deliveredAt ? "Teslim" : so.confirmedAt ? "Onaylı" : so.sentAt ? "Gönderildi" : "Bekliyor";
                      const statusColor = so.deliveredAt ? "bg-green-100 text-green-700"
                        : so.confirmedAt ? "bg-teal-100 text-teal-700"
                        : so.sentAt ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700";
                      return (
                        <tr key={so.id} className="border-b">
                          <td className="px-3 py-2 font-medium text-gray-700">{so.supplier.name}</td>
                          <td className="px-3 py-2 text-gray-600">{matName}{mats.length > 1 ? ` (+${mats.length - 1})` : ""}</td>
                          <td className="px-3 py-2 text-right">{matQty}</td>
                          <td className="px-3 py-2 text-right">{so.totalAmount || "-"}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColor}`}>{status}</span>
                          </td>
                          <td className="px-3 py-2 text-gray-500">{formatDate(so.sentAt)}</td>
                          <td className="px-3 py-2 text-gray-500">{formatDate(so.deliveredAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quality Checks */}
          {order.qualityChecks.length > 0 && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-4 text-sm font-medium text-gray-500">Kalite Kontrolleri ({order.qualityChecks.length})</h3>
              <div className="space-y-3">
                {order.qualityChecks.map(qc => {
                  const resCfg = QUALITY_RESULT_MAP[qc.result] || { label: qc.result, color: "bg-gray-100 text-gray-700" };
                  return (
                    <div key={qc.id} className="flex items-center gap-4 rounded-lg border p-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${resCfg.color}`}>{resCfg.label}</span>
                      <div className="flex-1 text-sm">
                        <p className="text-gray-700">
                          {qc.passedQuantity ?? (qc.inspectedQuantity - qc.defectQuantity)}/{qc.inspectedQuantity} geçti
                          {qc.defectQuantity > 0 && <span className="text-red-500"> · {qc.defectQuantity} hatalı</span>}
                        </p>
                        {qc.inspectorNotes && <p className="text-gray-500">{qc.inspectorNotes}</p>}
                      </div>
                      <div className="text-right text-xs text-gray-400">
                        <p>{formatDateTime(qc.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stage History / Timeline */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-sm font-medium text-gray-500">Aşama Geçmişi</h3>
            <div className="space-y-4">
              {(order.stageHistory || []).slice().reverse().map((entry, i, arr) => {
                const sCfg = STAGE_MAP[entry.stage] || STAGE_MAP.PENDING;
                const Icon = sCfg.icon;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        i === 0 ? "bg-[#7AC143] text-white" : "bg-gray-200 text-gray-500"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {i < arr.length - 1 && <div className="h-full w-0.5 bg-gray-200" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{sCfg.label}</span>
                        <span className="text-xs text-gray-400">{formatDateTime(entry.date)}</span>
                      </div>
                      {entry.changedBy && <p className="text-xs text-gray-400">{entry.changedBy}</p>}
                      {entry.note && <p className="mt-1 text-sm text-gray-600">{entry.note}</p>}
                    </div>
                  </div>
                );
              })}
              {(!order.stageHistory || order.stageHistory.length === 0) && (
                <p className="text-sm text-gray-400">Henüz aşama geçmişi yok</p>
              )}
            </div>
          </div>

          {/* Tracking Log */}
          {order.tracking.length > 0 && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-4 text-sm font-medium text-gray-500">Takip Kayıtları ({order.tracking.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Aşama</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">İlerleme</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Not</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.tracking.map(t => (
                      <tr key={t.id} className="border-b">
                        <td className="px-3 py-2">
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${(STAGE_MAP[t.stage] || STAGE_MAP.PENDING).color}`}>
                            {(STAGE_MAP[t.stage] || STAGE_MAP.PENDING).label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-gray-200">
                              <div className="h-2 rounded-full bg-[#7AC143]" style={{ width: `${t.progress}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{t.progress}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{t.notes || "-"}</td>
                        <td className="px-3 py-2 text-gray-500">{formatDateTime(t.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ─── Right Column ─── */}
        <div className="space-y-6">
          {/* Order Info */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-sm font-medium text-gray-500">Sipariş Bilgileri</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Sipariş No</dt>
                <dd className="font-medium text-gray-900">{order.orderNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Toplam Adet</dt>
                <dd className="font-medium text-gray-900">{order.totalQuantity.toLocaleString("tr-TR")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Öncelik</dt>
                <dd>
                  {editMode ? (
                    <select value={editData.priority} onChange={(e) => setEditData({ ...editData, priority: e.target.value })} className="form-input text-xs">
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
                <dt className="text-gray-500">Hedef Tarih</dt>
                <dd>
                  {editMode ? (
                    <input type="date" value={editData.targetDate} onChange={(e) => setEditData({ ...editData, targetDate: e.target.value })} className="form-input text-xs" />
                  ) : (
                    <span className={isOverdue ? "font-medium text-red-500" : "text-gray-700"}>{formatDate(order.targetDate)}</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Tahmini Teslim</dt>
                <dd className="text-gray-700">{formatDate(order.estimatedDelivery)}</dd>
              </div>
              {order.actualDelivery && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Gerçek Teslim</dt>
                  <dd className="font-medium text-green-600">{formatDate(order.actualDelivery)}</dd>
                </div>
              )}
              {order.dealerOrderId && (
                <div className="flex justify-between border-t pt-3">
                  <dt className="text-gray-500">Bayi Siparişi</dt>
                  <dd className="font-medium text-[#7AC143]">{order.dealerOrderId}</dd>
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
              <p className="whitespace-pre-wrap text-sm text-gray-600">
                {order.notes || "Not eklenmemiş."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
