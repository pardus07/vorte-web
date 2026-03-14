"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
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
} from "lucide-react";

interface FullProductionOrder {
  id: string;
  orderNumber: string;
  stage: string;
  priority: string;
  totalQuantity: number;
  targetDate: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  notes: string | null;
  createdAt: string;
  items: { id: string; productName: string; sku: string; color: string; totalQuantity: number }[];
  _count?: { tracking: number; qualityChecks: number };
}

interface StageStats {
  PENDING: number;
  BOM_CALCULATED: number;
  MATERIALS_ORDERED: number;
  MATERIALS_RECEIVED: number;
  IN_PRODUCTION: number;
  QUALITY_CHECK: number;
  PACKAGING_STAGE: number;
  PROD_SHIPPED: number;
  PROD_DELIVERED: number;
  PROD_CANCELLED: number;
  totalQuantity: number;
}

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

const ACTIVE_STAGES = ["PENDING", "BOM_CALCULATED", "MATERIALS_ORDERED", "MATERIALS_RECEIVED", "IN_PRODUCTION", "QUALITY_CHECK", "PACKAGING_STAGE", "PROD_SHIPPED"] as const;

export default function UretimPage() {
  const [orders, setOrders] = useState<FullProductionOrder[]>([]);
  const [stats, setStats] = useState<StageStats>({
    PENDING: 0, BOM_CALCULATED: 0, MATERIALS_ORDERED: 0, MATERIALS_RECEIVED: 0,
    IN_PRODUCTION: 0, QUALITY_CHECK: 0, PACKAGING_STAGE: 0, PROD_SHIPPED: 0,
    PROD_DELIVERED: 0, PROD_CANCELLED: 0, totalQuantity: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // New order form state
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string; sku: string; variants: { color: string; size: string }[] }[]>([]);
  const [formData, setFormData] = useState({ priority: "normal", notes: "", targetDate: "" });
  const [formItems, setFormItems] = useState<{ productId: string; sku: string; productName: string; color: string; sizeS: number; sizeM: number; sizeL: number; sizeXL: number; sizeXXL: number }[]>([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const limit = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (stageFilter !== "all") params.set("stage", stageFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/production-full?${params}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
      setTotal(data.total);
      setStats(data.stats);
    }
    setLoading(false);
  }, [page, stageFilter, priorityFilter, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const fetchProducts = async () => {
    const res = await fetch("/api/admin/products?limit=100");
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products.map((p: any) => ({
        id: p.id, name: p.name, sku: p.sku || "",
        variants: p.variants?.map((v: any) => ({ color: v.color, size: v.size })) || [],
      })));
    }
  };

  const handleOpenForm = () => {
    if (products.length === 0) fetchProducts();
    setShowForm(true);
    setFormError("");
    setFormItems([]);
  };

  const addFormItem = () => {
    setFormItems([...formItems, { productId: "", sku: "", productName: "", color: "", sizeS: 0, sizeM: 0, sizeL: 0, sizeXL: 0, sizeXXL: 0 }]);
  };

  const updateFormItem = (idx: number, field: string, value: any) => {
    const items = [...formItems];
    (items[idx] as any)[field] = value;
    if (field === "productId") {
      const prod = products.find(p => p.id === value);
      if (prod) {
        items[idx].productName = prod.name;
        items[idx].sku = prod.sku;
      }
    }
    setFormItems(items);
  };

  const removeFormItem = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (formItems.length === 0) { setFormError("En az bir ürün ekleyin."); return; }
    if (!formData.targetDate) { setFormError("Hedef tarih zorunludur."); return; }

    const hasQty = formItems.some(item =>
      item.sizeS + item.sizeM + item.sizeL + item.sizeXL + item.sizeXXL > 0
    );
    if (!hasQty) { setFormError("En az bir beden adedi giriniz."); return; }

    setSaving(true);
    setFormError("");
    const res = await fetch("/api/admin/production-full", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: formItems.map(item => ({
          productId: item.productId,
          sku: item.sku,
          productName: item.productName,
          color: item.color,
          sizeS: item.sizeS, sizeM: item.sizeM, sizeL: item.sizeL, sizeXL: item.sizeXL, sizeXXL: item.sizeXXL,
        })),
        priority: formData.priority,
        notes: formData.notes || undefined,
        targetDate: formData.targetDate,
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setFormData({ priority: "normal", notes: "", targetDate: "" });
      setFormItems([]);
      fetchOrders();
    } else {
      const data = await res.json();
      setFormError(data.error || "Hata oluştu");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu üretim siparişini silmek istediğinize emin misiniz?")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/production-full/${id}`, { method: "DELETE" });
    if (res.ok) fetchOrders();
    else {
      const data = await res.json();
      alert(data.error || "Silinemedi");
    }
    setDeleting(null);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("tr-TR");
  };

  const isOverdue = (order: FullProductionOrder) => {
    if (["PROD_DELIVERED", "PROD_CANCELLED"].includes(order.stage)) return false;
    const target = order.estimatedDelivery || order.targetDate;
    if (!target) return false;
    return new Date(target) < new Date();
  };

  const totalPages = Math.ceil(total / limit);

  // Summary stat boxes — show top 6 active stages
  const statBoxes = [
    { key: "PENDING", ...STAGE_MAP.PENDING },
    { key: "BOM_CALCULATED", ...STAGE_MAP.BOM_CALCULATED },
    { key: "MATERIALS_ORDERED", ...STAGE_MAP.MATERIALS_ORDERED },
    { key: "IN_PRODUCTION", ...STAGE_MAP.IN_PRODUCTION },
    { key: "QUALITY_CHECK", ...STAGE_MAP.QUALITY_CHECK },
    { key: "PROD_DELIVERED", ...STAGE_MAP.PROD_DELIVERED },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Üretim Siparişleri</h1>
          <p className="mt-1 text-sm text-gray-500">
            Toplam {total} sipariş · {stats.totalQuantity.toLocaleString("tr-TR")} adet
          </p>
        </div>
        <button
          onClick={handleOpenForm}
          className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6aad38]"
        >
          <Plus className="h-4 w-4" /> Yeni Üretim Siparişi
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statBoxes.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {stats[key as keyof StageStats] || 0}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Sipariş no, ürün adı ara..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input w-full pl-10"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
          className="form-input"
        >
          <option value="all">Tüm Aşamalar</option>
          {Object.entries(STAGE_MAP).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          className="form-input"
        >
          <option value="all">Tüm Öncelikler</option>
          <option value="urgent">Acil</option>
          <option value="high">Yüksek</option>
          <option value="normal">Normal</option>
          <option value="low">Düşük</option>
        </select>
      </div>

      {/* Table */}
      {!loading ? (
        <div className="rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">Sipariş No</th>
                  <th className="px-4 py-3 font-medium">Ürünler</th>
                  <th className="px-4 py-3 font-medium text-right">Adet</th>
                  <th className="px-4 py-3 font-medium">Aşama</th>
                  <th className="px-4 py-3 font-medium">Öncelik</th>
                  <th className="px-4 py-3 font-medium">Hedef</th>
                  <th className="px-4 py-3 font-medium">Tahmini Teslim</th>
                  <th className="px-4 py-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const stageCfg = STAGE_MAP[order.stage] || STAGE_MAP.PENDING;
                  const priCfg = PRIORITY_MAP[order.priority] || PRIORITY_MAP.normal;
                  const overdue = isOverdue(order);
                  const productNames = order.items?.map(i => i.productName).filter(Boolean).join(", ") || "-";

                  return (
                    <tr key={order.id} className={`border-b hover:bg-gray-50 ${overdue ? "bg-red-50/50" : ""}`}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/uretim/${order.id}`} className="font-medium text-[#7AC143] hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-gray-700 truncate block">{productNames}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{order.totalQuantity.toLocaleString("tr-TR")}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${stageCfg.color}`}>
                          {stageCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${priCfg.color}`}>{priCfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={overdue ? "font-medium text-red-500" : "text-gray-500"}>
                          {formatDate(order.targetDate)}
                          {overdue && <AlertTriangle className="ml-1 inline h-3 w-3" />}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(order.estimatedDelivery)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/uretim/${order.id}`}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="Detay"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {["PENDING", "PROD_CANCELLED"].includes(order.stage) && (
                            <button
                              onClick={() => handleDelete(order.id)}
                              disabled={deleting === order.id}
                              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                              title="Sil"
                            >
                              {deleting === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      Henüz üretim siparişi bulunmuyor
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-gray-500">Sayfa {page} / {totalPages} · Toplam {total}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded p-1 hover:bg-gray-100 disabled:opacity-50">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded p-1 hover:bg-gray-100 disabled:opacity-50">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center text-gray-400">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2">Yükleniyor...</p>
        </div>
      )}

      {/* New Order Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-3xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Yeni Üretim Siparişi (Tam Planlama)</h2>
              <p className="mt-1 text-sm text-gray-500">BOM otomatik hesaplanır, termin tahmini yapılır</p>
            </div>
            <div className="space-y-4 p-6">
              {formError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{formError}</div>}

              {/* Items */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Ürün Kalemleri</label>
                  <button onClick={addFormItem} className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                    <Plus className="h-3 w-3" /> Kalem Ekle
                  </button>
                </div>
                {formItems.map((item, idx) => (
                  <div key={idx} className="mb-3 rounded-lg border p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <select
                        value={item.productId}
                        onChange={(e) => updateFormItem(idx, "productId", e.target.value)}
                        className="form-input flex-1 text-sm"
                      >
                        <option value="">Ürün seçin</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                      <input
                        type="text"
                        value={item.color}
                        onChange={(e) => updateFormItem(idx, "color", e.target.value)}
                        className="form-input w-32 text-sm"
                        placeholder="Renk"
                      />
                      <button onClick={() => removeFormItem(idx)} className="rounded p-1.5 text-red-400 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {(["S", "M", "L", "XL", "XXL"] as const).map(size => (
                        <div key={size}>
                          <label className="mb-1 block text-center text-[10px] font-medium text-gray-500">{size}</label>
                          <input
                            type="number"
                            min="0"
                            value={(item as any)[`size${size}`] || ""}
                            onChange={(e) => updateFormItem(idx, `size${size}`, parseInt(e.target.value) || 0)}
                            className="form-input w-full text-center text-sm"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {formItems.length === 0 && (
                  <p className="rounded-lg border-2 border-dashed p-6 text-center text-sm text-gray-400">
                    Henüz ürün eklenmedi. &quot;Kalem Ekle&quot; butonuna tıklayın.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Hedef Tarih *</label>
                  <input
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Öncelik</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="form-input w-full"
                  >
                    <option value="low">Düşük</option>
                    <option value="normal">Normal</option>
                    <option value="high">Yüksek</option>
                    <option value="urgent">Acil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notlar</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-input w-full"
                  rows={2}
                  placeholder="Üretim notları..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                İptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-6 py-2 text-sm font-medium text-white hover:bg-[#6aad38] disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Oluşturuluyor..." : "Oluştur (BOM + Termin Otomatik)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
