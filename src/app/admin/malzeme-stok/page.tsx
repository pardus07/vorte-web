"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Package,
  AlertTriangle,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Loader2,
  TrendingDown,
  DollarSign,
  Layers,
} from "lucide-react";

interface Supplier {
  id: string;
  name: string;
}

interface Material {
  id: string;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  unitPrice: number;
  supplierId: string | null;
  supplier: Supplier | null;
  lastRestocked: string | null;
  notes: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  fabric: "Kumaş",
  elastic: "Lastik",
  thread: "İplik",
  packaging: "Ambalaj",
  label: "Etiket",
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS);

const UNIT_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "m", label: "m" },
  { value: "adet", label: "Adet" },
  { value: "rulo", label: "Rulo" },
];

const emptyForm = {
  name: "",
  type: "fabric",
  quantity: 0,
  unit: "kg",
  minQuantity: 0,
  unitPrice: 0,
  supplierId: "",
  notes: "",
};

const inputClassName =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20";

export default function MalzemeStokPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [total, setTotal] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/admin/materials?${params.toString()}`);
      const data = await res.json();
      setMaterials(data.materials || []);
      setTotal(data.total || 0);
      setLowStockCount(data.lowStockCount || 0);
    } catch {
      // silent
    }
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const totalValue = materials.reduce(
    (sum, m) => sum + m.quantity * m.unitPrice,
    0
  );

  const openNewModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (m: Material) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      type: m.type,
      quantity: m.quantity,
      unit: m.unit,
      minQuantity: m.minQuantity,
      unitPrice: m.unitPrice,
      supplierId: m.supplierId || "",
      notes: m.notes || "",
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Malzeme adı zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editingId
        ? `/api/admin/materials/${editingId}`
        : "/api/admin/materials";
      const method = editingId ? "PATCH" : "POST";
      const body = {
        ...form,
        quantity: Number(form.quantity),
        minQuantity: Number(form.minQuantity),
        unitPrice: Number(form.unitPrice),
        supplierId: form.supplierId || null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Bir hata oluştu");
      }
      closeModal();
      fetchMaterials();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu malzemeyi silmek istediğinize emin misiniz?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/materials/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      fetchMaterials();
    } catch {
      alert("Silme işlemi başarısız oldu.");
    }
    setDeleting(null);
  };

  const getQuantityStyle = (quantity: number, minQuantity: number) => {
    if (quantity <= minQuantity) return "text-red-600 font-semibold";
    if (quantity <= minQuantity * 1.5) return "text-orange-500 font-medium";
    return "text-gray-900";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("tr-TR");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Malzeme Stok
          </h1>
          {lowStockCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 ring-1 ring-red-100">
              <AlertTriangle className="h-3.5 w-3.5" />
              {lowStockCount} düşük stok
            </span>
          )}
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333]"
        >
          <Plus className="h-4 w-4" />
          Yeni Malzeme
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Layers className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam Malzeme</p>
              <p className="text-xl font-bold text-gray-900">{total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Düşük Stok</p>
              <p className="text-xl font-bold text-red-600">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam Değer</p>
              <p className="text-xl font-bold text-gray-900">
                {totalValue.toLocaleString("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Malzeme ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-auto rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
        >
          <option value="all">Tüm Türler</option>
          {TYPE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/80">
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Malzeme Adı
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Tür
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Miktar
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Birim
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Min. Miktar
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Birim Fiyat
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Tedarikçi
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Son Stok Tarihi
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Yükleniyor...</p>
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Package className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      Malzeme bulunamadı.
                    </p>
                  </td>
                </tr>
              ) : (
                materials.map((m) => {
                  const isLow = m.quantity <= m.minQuantity;
                  return (
                    <tr
                      key={m.id}
                      className={`transition-colors hover:bg-gray-50 ${
                        isLow ? "bg-red-50/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {m.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {TYPE_LABELS[m.type] || m.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 ${getQuantityStyle(m.quantity, m.minQuantity)}`}
                        >
                          {m.quantity.toLocaleString("tr-TR")}
                          {isLow && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.unit}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {m.minQuantity.toLocaleString("tr-TR")}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {m.unitPrice.toLocaleString("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {m.supplier?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(m.lastRestocked)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(m)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                            title="Düzenle"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            disabled={deleting === m.id}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
                            title="Sil"
                          >
                            {deleting === m.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? "Malzeme Düzenle" : "Yeni Malzeme"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Malzeme Adı *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={inputClassName}
                  placeholder="Örn: Pamuklu Kumaş"
                />
              </div>

              {/* Type + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tür
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value }))
                    }
                    className={inputClassName}
                  >
                    {TYPE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Birim
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, unit: e.target.value }))
                    }
                    className={inputClassName}
                  >
                    {UNIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantity + Min Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Miktar
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        quantity: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Min. Miktar
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.minQuantity}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        minQuantity: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className={inputClassName}
                  />
                </div>
              </div>

              {/* Unit Price */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Birim Fiyat (TRY)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.unitPrice}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      unitPrice: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className={inputClassName}
                />
              </div>

              {/* Supplier ID */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Tedarikçi ID
                </label>
                <input
                  type="text"
                  value={form.supplierId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supplierId: e.target.value }))
                  }
                  className={inputClassName}
                  placeholder="Opsiyonel"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Notlar
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className={inputClassName}
                  rows={3}
                  placeholder="Opsiyonel notlar..."
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333] disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
