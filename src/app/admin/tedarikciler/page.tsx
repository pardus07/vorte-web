"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Truck,
  Filter,
} from "lucide-react";

// --- Types ---

type SupplierType = "FABRIC" | "ELASTIC" | "THREAD" | "PACKAGING" | "LABEL";

interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  type: SupplierType;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

// --- Constants ---

const TYPE_LABELS: Record<SupplierType, string> = {
  FABRIC: "Kumaş",
  ELASTIC: "Lastik",
  THREAD: "İplik",
  PACKAGING: "Ambalaj",
  LABEL: "Etiket",
};

const TYPE_COLORS: Record<SupplierType, string> = {
  FABRIC: "bg-blue-100 text-blue-700",
  ELASTIC: "bg-purple-100 text-purple-700",
  THREAD: "bg-orange-100 text-orange-700",
  PACKAGING: "bg-cyan-100 text-cyan-700",
  LABEL: "bg-teal-100 text-teal-700",
};

const TYPE_TABS: { value: string; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "FABRIC", label: "Kumaş" },
  { value: "ELASTIC", label: "Lastik" },
  { value: "THREAD", label: "İplik" },
  { value: "PACKAGING", label: "Ambalaj" },
  { value: "LABEL", label: "Etiket" },
];

const EMPTY_FORM = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  type: "FABRIC" as SupplierType,
  isActive: true,
  notes: "",
};

// --- Component ---

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const limit = 20;

  // --- Fetch ---

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    if (activeFilter) params.set("active", activeFilter);

    try {
      const res = await fetch(`/api/admin/suppliers?${params}`);
      const data = await res.json();
      setSuppliers(data.suppliers || []);
      setTotal(data.total || 0);
    } catch {
      // silent
    }
    setLoading(false);
  }, [page, search, typeFilter, activeFilter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // --- Handlers ---

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSuppliers();
  };

  const openNewModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      type: supplier.type,
      isActive: supplier.isActive,
      notes: supplier.notes || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    try {
      const url = editingId
        ? `/api/admin/suppliers/${editingId}`
        : "/api/admin/suppliers";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          contactPerson: form.contactPerson.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          type: form.type,
          isActive: form.isActive,
          notes: form.notes.trim() || null,
        }),
      });

      if (res.ok) {
        closeModal();
        fetchSuppliers();
      }
    } catch {
      // silent
    }
    setSaving(false);
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`"${supplier.name}" tedarikçisi devre dışı bırakılacak. Emin misiniz?`)) return;

    try {
      const res = await fetch(`/api/admin/suppliers/${supplier.id}`, {
        method: "DELETE",
      });
      if (res.ok) fetchSuppliers();
    } catch {
      // silent
    }
  };

  // --- Derived ---

  const totalPages = Math.ceil(total / limit);

  // --- Render ---

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tedarikçiler</h1>
          <p className="mt-1 text-sm text-gray-500">
            Toplam {total} tedarikçi
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#7AC143] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6aad38]"
        >
          <Plus className="h-4 w-4" />
          Yeni Tedarikçi
        </button>
      </div>

      {/* Type Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setTypeFilter(tab.value);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              typeFilter === tab.value
                ? "border-[#7AC143] bg-[#7AC143]/10 font-medium text-[#7AC143]"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.value === "" && <Filter className="h-3.5 w-3.5" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Active Filter */}
      <div className="mt-4 flex flex-col gap-3 lg:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tedarikçi adı, yetkili, e-posta, telefon..."
              className="form-input w-full pl-10"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[#7AC143] px-4 py-2 text-sm font-medium text-white hover:bg-[#6aad38]"
          >
            Ara
          </button>
          {(search || activeFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActiveFilter("");
                setPage(1);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <X className="h-3.5 w-3.5" /> Temizle
            </button>
          )}
        </form>
        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPage(1);
          }}
          className="form-input"
        >
          <option value="">Tüm Durum</option>
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Tedarikçi Adı</th>
                <th className="px-4 py-3 font-medium text-gray-700">Tür</th>
                <th className="px-4 py-3 font-medium text-gray-700">Yetkili Kişi</th>
                <th className="px-4 py-3 font-medium text-gray-700">E-posta</th>
                <th className="px-4 py-3 font-medium text-gray-700">Telefon</th>
                <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                <th className="px-4 py-3 font-medium text-gray-700">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{supplier.name}</p>
                    {supplier.address && (
                      <p className="mt-0.5 text-xs text-gray-500 truncate max-w-[200px]">
                        {supplier.address}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        TYPE_COLORS[supplier.type]
                      }`}
                    >
                      {TYPE_LABELS[supplier.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {supplier.contactPerson || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {supplier.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {supplier.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        supplier.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {supplier.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(supplier)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Düzenle"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {search || typeFilter || activeFilter
                      ? "Eşleşen tedarikçi bulunamadı"
                      : "Henüz tedarikçi eklenmemiş"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Sayfa {page} / {totalPages} · Toplam {total} tedarikçi
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pn: number;
              if (totalPages <= 5) pn = i + 1;
              else if (page <= 3) pn = i + 1;
              else if (page >= totalPages - 2) pn = totalPages - 4 + i;
              else pn = page - 2 + i;
              return (
                <button
                  key={pn}
                  onClick={() => setPage(pn)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    page === pn
                      ? "border-[#7AC143] bg-[#7AC143]/10 font-medium text-[#7AC143]"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {pn}
                </button>
              );
            })}
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Truck className="h-5 w-5 text-[#7AC143]" />
                {editingId ? "Tedarikçi Düzenle" : "Yeni Tedarikçi"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tedarikçi Adı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Tedarikçi firma adı"
                    className="form-input w-full"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tür <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({ ...form, type: e.target.value as SupplierType })
                    }
                    className="form-input w-full"
                  >
                    {(Object.keys(TYPE_LABELS) as SupplierType[]).map((key) => (
                      <option key={key} value={key}>
                        {TYPE_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contact Person */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Yetkili Kişi
                  </label>
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={(e) =>
                      setForm({ ...form, contactPerson: e.target.value })
                    }
                    placeholder="Ad Soyad"
                    className="form-input w-full"
                  />
                </div>

                {/* Email + Phone */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      E-posta
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="ornek@firma.com"
                      className="form-input w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="0XXX XXX XX XX"
                      className="form-input w-full"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Adres
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    placeholder="Firma adresi"
                    className="form-input w-full"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Notlar
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    rows={3}
                    placeholder="Ek notlar..."
                    className="form-input w-full resize-none"
                  />
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm({ ...form, isActive: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#7AC143] peer-checked:after:translate-x-full" />
                  </label>
                  <span className="text-sm text-gray-700">
                    {form.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#7AC143] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6aad38] disabled:opacity-50"
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : null}
                {editingId ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
