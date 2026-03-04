"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Factory,
  Plus,
  Search,
  Eye,
  Trash2,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Scissors,
  CheckCircle2,
  Package,
  ClipboardCheck,
  Timer,
  AlertTriangle,
} from "lucide-react";

interface ProductionOrder {
  id: string;
  orderNumber: string;
  productId: string;
  product: { name: string; images: string[] };
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
  _count: { logs: number };
}

interface Stats {
  planned: number;
  cutting: number;
  sewing: number;
  quality: number;
  packaging: number;
  completed: number;
  totalQuantity: number;
}

interface ProductOption {
  id: string;
  name: string;
  variants: { color: string; size: string; stock: number }[];
  costPrice: number | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  planned: { label: "Planlanan", color: "bg-blue-100 text-blue-700", icon: Timer },
  cutting: { label: "Kesim", color: "bg-yellow-100 text-yellow-700", icon: Scissors },
  sewing: { label: "Dikim", color: "bg-orange-100 text-orange-700", icon: Factory },
  quality: { label: "Kalite Kontrol", color: "bg-purple-100 text-purple-700", icon: ClipboardCheck },
  packaging: { label: "Paketleme", color: "bg-cyan-100 text-cyan-700", icon: Package },
  completed: { label: "Tamamlandı", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "bg-gray-100 text-gray-600" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-600" },
  high: { label: "Yüksek", color: "bg-orange-100 text-orange-600" },
  urgent: { label: "Acil", color: "bg-red-100 text-red-600" },
};

const STATUSES = ["planned", "cutting", "sewing", "quality", "packaging", "completed"] as const;

export default function UretimPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [stats, setStats] = useState<Stats>({ planned: 0, cutting: 0, sewing: 0, quality: 0, packaging: 0, completed: 0, totalQuantity: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [loading, setLoading] = useState(true);

  // New order form
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [formData, setFormData] = useState({
    productId: "",
    targetDate: "",
    priority: "normal",
    materialCost: "",
    laborCost: "",
    notes: "",
  });
  const [variantMatrix, setVariantMatrix] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/production?${params}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
      setTotal(data.total);
      setStats(data.stats);
    }
    setLoading(false);
  }, [page, statusFilter, priorityFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Fetch products for form
  const fetchProducts = async () => {
    const res = await fetch("/api/admin/products?limit=100");
    if (res.ok) {
      const data = await res.json();
      setProducts(
        data.products.map((p: { id: string; name: string; variants: { color: string; size: string; stock: number }[]; costPrice: number | null }) => ({
          id: p.id,
          name: p.name,
          variants: p.variants,
          costPrice: p.costPrice,
        }))
      );
    }
  };

  const handleOpenForm = () => {
    if (products.length === 0) fetchProducts();
    setShowForm(true);
    setFormError("");
  };

  const selectedProduct = products.find((p) => p.id === formData.productId);
  const uniqueColors = selectedProduct ? [...new Set(selectedProduct.variants.map((v) => v.color))] : [];
  const uniqueSizes = selectedProduct ? [...new Set(selectedProduct.variants.map((v) => v.size))] : [];

  const handleProductChange = (productId: string) => {
    setFormData({ ...formData, productId });
    setVariantMatrix({});
  };

  const handleMatrixChange = (color: string, size: string, qty: string) => {
    const key = `${color}|${size}`;
    const val = parseInt(qty) || 0;
    setVariantMatrix((prev) => ({ ...prev, [key]: val }));
  };

  const totalQuantity = Object.values(variantMatrix).reduce((s, q) => s + q, 0);

  const handleSubmit = async () => {
    if (!formData.productId || !formData.targetDate) {
      setFormError("Ürün ve hedef tarih zorunludur.");
      return;
    }
    if (totalQuantity === 0) {
      setFormError("En az bir varyant için adet giriniz.");
      return;
    }

    const variants = Object.entries(variantMatrix)
      .filter(([, qty]) => qty > 0)
      .map(([key, quantity]) => {
        const [color, size] = key.split("|");
        return { color, size, quantity };
      });

    setSaving(true);
    setFormError("");
    const res = await fetch("/api/admin/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        materialCost: formData.materialCost ? parseFloat(formData.materialCost) : undefined,
        laborCost: formData.laborCost ? parseFloat(formData.laborCost) : undefined,
        variants,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setFormData({ productId: "", targetDate: "", priority: "normal", materialCost: "", laborCost: "", notes: "" });
      setVariantMatrix({});
      fetchOrders();
    } else {
      const data = await res.json();
      setFormError(data.error || "Hata oluştu");
    }
    setSaving(false);
  };

  // Kanban status change
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const res = await fetch(`/api/admin/production/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) fetchOrders();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu üretim emrini silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`/api/admin/production/${id}`, { method: "DELETE" });
    if (res.ok) fetchOrders();
    else {
      const data = await res.json();
      alert(data.error || "Silinemedi");
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("tr-TR");
  };

  const isOverdue = (targetDate: string, status: string) => {
    if (status === "completed") return false;
    return new Date(targetDate) < new Date();
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Üretim Planlama</h1>
          <p className="mt-1 text-sm text-gray-500">
            Toplam {total} üretim emri · {stats.totalQuantity.toLocaleString("tr-TR")} adet
          </p>
        </div>
        <button onClick={handleOpenForm} className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6aad38]">
          <Plus className="h-4 w-4" /> Yeni Üretim Emri
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {STATUSES.map((s) => {
          const cfg = STATUS_MAP[s];
          const Icon = cfg.icon;
          return (
            <div key={s} className="rounded-lg border bg-white p-4">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-500">{cfg.label}</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats[s as keyof Stats]}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Üretim no, ürün adı ara..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input w-full pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="form-input"
        >
          <option value="all">Tüm Durumlar</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_MAP[s].label}</option>
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
        <div className="flex rounded-lg border bg-white">
          <button
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-1 rounded-l-lg px-3 py-2 text-sm ${viewMode === "kanban" ? "bg-[#7AC143]/10 text-[#7AC143]" : "text-gray-500"}`}
          >
            <LayoutGrid className="h-4 w-4" /> Kanban
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1 rounded-r-lg px-3 py-2 text-sm ${viewMode === "list" ? "bg-[#7AC143]/10 text-[#7AC143]" : "text-gray-500"}`}
          >
            <List className="h-4 w-4" /> Liste
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && !loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {STATUSES.map((status) => {
            const cfg = STATUS_MAP[status];
            const Icon = cfg.icon;
            const columnOrders = orders.filter((o) => o.status === status);
            return (
              <div key={status} className="rounded-lg border bg-gray-50">
                <div className="flex items-center gap-2 border-b bg-white px-3 py-2 rounded-t-lg">
                  <Icon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{cfg.label}</span>
                  <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium">{columnOrders.length}</span>
                </div>
                <div className="space-y-2 p-2" style={{ minHeight: 100 }}>
                  {columnOrders.map((order) => {
                    const overdue = isOverdue(order.targetDate, order.status);
                    const priCfg = PRIORITY_MAP[order.priority];
                    const statusIdx = STATUSES.indexOf(status);
                    const nextStatus = statusIdx < STATUSES.length - 1 ? STATUSES[statusIdx + 1] : null;
                    const prevStatus = statusIdx > 0 ? STATUSES[statusIdx - 1] : null;
                    return (
                      <div key={order.id} className={`rounded-lg border bg-white p-3 text-xs ${overdue ? "border-red-300" : ""}`}>
                        <div className="flex items-center justify-between">
                          <Link href={`/admin/uretim/${order.id}`} className="font-medium text-[#7AC143] hover:underline">
                            {order.orderNumber}
                          </Link>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${priCfg.color}`}>{priCfg.label}</span>
                        </div>
                        <p className="mt-1 text-gray-600 truncate">{order.product.name}</p>
                        <p className="mt-1 text-gray-500">{order.totalQuantity.toLocaleString("tr-TR")} adet</p>
                        {overdue && (
                          <div className="mt-1 flex items-center gap-1 text-red-500">
                            <AlertTriangle className="h-3 w-3" /> Gecikmiş
                          </div>
                        )}
                        <p className="mt-1 text-gray-400">Hedef: {formatDate(order.targetDate)}</p>
                        {/* Move buttons */}
                        <div className="mt-2 flex gap-1">
                          {prevStatus && (
                            <button
                              onClick={() => handleStatusChange(order.id, prevStatus)}
                              className="flex-1 rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-200"
                              title={`← ${STATUS_MAP[prevStatus].label}`}
                            >
                              ← Geri
                            </button>
                          )}
                          {nextStatus && (
                            <button
                              onClick={() => handleStatusChange(order.id, nextStatus)}
                              className="flex-1 rounded bg-[#7AC143]/10 px-2 py-1 text-[10px] text-[#7AC143] hover:bg-[#7AC143]/20"
                              title={`${STATUS_MAP[nextStatus].label} →`}
                            >
                              İleri →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && !loading && (
        <div className="rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">Üretim No</th>
                  <th className="px-4 py-3 font-medium">Ürün</th>
                  <th className="px-4 py-3 font-medium text-right">Adet</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Öncelik</th>
                  <th className="px-4 py-3 font-medium">Başlangıç</th>
                  <th className="px-4 py-3 font-medium">Hedef</th>
                  <th className="px-4 py-3 font-medium">Maliyet</th>
                  <th className="px-4 py-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const statusCfg = STATUS_MAP[order.status];
                  const priCfg = PRIORITY_MAP[order.priority];
                  const overdue = isOverdue(order.targetDate, order.status);
                  const totalCost = (order.materialCost || 0) + (order.laborCost || 0);
                  return (
                    <tr key={order.id} className={`border-b hover:bg-gray-50 ${overdue ? "bg-red-50" : ""}`}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/uretim/${order.id}`} className="font-medium text-[#7AC143] hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{order.product.name}</td>
                      <td className="px-4 py-3 text-right font-medium">{order.totalQuantity.toLocaleString("tr-TR")}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${priCfg.color}`}>{priCfg.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(order.startDate)}</td>
                      <td className="px-4 py-3">
                        <span className={overdue ? "text-red-500 font-medium" : "text-gray-500"}>
                          {formatDate(order.targetDate)}
                          {overdue && " ⚠"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {totalCost > 0 ? `₺${totalCost.toLocaleString("tr-TR")}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/uretim/${order.id}`}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {["planned", "completed"].includes(order.status) && (
                            <button
                              onClick={() => handleDelete(order.id)}
                              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">Henüz üretim emri bulunmuyor</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-gray-500">{total} kayıt</p>
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
      )}

      {loading && (
        <div className="py-20 text-center text-gray-400">Yükleniyor...</div>
      )}

      {/* New Order Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Yeni Üretim Emri</h2>
            </div>
            <div className="space-y-4 p-6">
              {formError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{formError}</div>}

              {/* Product selection */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Ürün *</label>
                <select
                  value={formData.productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="">Ürün seçiniz</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Variant matrix */}
              {selectedProduct && uniqueColors.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Varyasyon Adetleri (Renk × Beden)
                  </label>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Renk</th>
                          {uniqueSizes.map((size) => (
                            <th key={size} className="px-3 py-2 text-center text-xs font-medium text-gray-500">{size}</th>
                          ))}
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueColors.map((color) => {
                          const rowTotal = uniqueSizes.reduce((s, size) => s + (variantMatrix[`${color}|${size}`] || 0), 0);
                          return (
                            <tr key={color} className="border-t">
                              <td className="px-3 py-2 font-medium text-gray-700">{color}</td>
                              {uniqueSizes.map((size) => {
                                const hasVariant = selectedProduct.variants.some((v) => v.color === color && v.size === size);
                                return (
                                  <td key={size} className="px-1 py-1 text-center">
                                    {hasVariant ? (
                                      <input
                                        type="number"
                                        min="0"
                                        value={variantMatrix[`${color}|${size}`] || ""}
                                        onChange={(e) => handleMatrixChange(color, size, e.target.value)}
                                        className="w-16 rounded border px-2 py-1 text-center text-sm"
                                        placeholder="0"
                                      />
                                    ) : (
                                      <span className="text-gray-300">—</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-right font-medium text-gray-600">{rowTotal}</td>
                            </tr>
                          );
                        })}
                        <tr className="border-t bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-700">Toplam</td>
                          {uniqueSizes.map((size) => {
                            const colTotal = uniqueColors.reduce((s, color) => s + (variantMatrix[`${color}|${size}`] || 0), 0);
                            return <td key={size} className="px-3 py-2 text-center font-medium">{colTotal || ""}</td>;
                          })}
                          <td className="px-3 py-2 text-right font-bold text-[#7AC143]">{totalQuantity}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Malzeme Maliyeti (₺)</label>
                  <input
                    type="number"
                    value={formData.materialCost}
                    onChange={(e) => setFormData({ ...formData, materialCost: e.target.value })}
                    className="form-input w-full"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">İşçilik Maliyeti (₺)</label>
                  <input
                    type="number"
                    value={formData.laborCost}
                    onChange={(e) => setFormData({ ...formData, laborCost: e.target.value })}
                    className="form-input w-full"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notlar</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-input w-full"
                  rows={3}
                  placeholder="Üretim ile ilgili notlar..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="rounded-lg bg-[#7AC143] px-6 py-2 text-sm font-medium text-white hover:bg-[#6aad38] disabled:opacity-50"
              >
                {saving ? "Kaydediliyor..." : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
