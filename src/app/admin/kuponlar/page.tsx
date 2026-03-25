"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Edit, Tag, Search, Gift, Truck, ShoppingBag, Percent, Clock, Ticket, BarChart3, XCircle, Users } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  name: string | null;
  discountType: string;
  discountValue: number;
  minAmount: number | null;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  currentUses: number;
  startsAt: string | null;
  expiresAt: string | null;
  active: boolean;
  campaignType: string;
  freeShipping: boolean;
  buyQuantity: number | null;
  getQuantity: number | null;
  orderScope: string;
  description: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  active: number;
  expired: number;
  totalUses: number;
}

const CAMPAIGN_TYPES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  general: { label: "Genel Indirim", icon: Percent, color: "bg-blue-100 text-blue-700" },
  free_shipping: { label: "Ucretsiz Kargo", icon: Truck, color: "bg-green-100 text-green-700" },
  buy_x_get_y: { label: "X Al Y Ode", icon: Gift, color: "bg-purple-100 text-purple-700" },
  first_order: { label: "Ilk Siparis", icon: ShoppingBag, color: "bg-orange-100 text-orange-700" },
  product_specific: { label: "Urun Bazli", icon: Tag, color: "bg-cyan-100 text-cyan-700" },
  category_specific: { label: "Kategori Bazli", icon: Tag, color: "bg-yellow-100 text-yellow-700" },
};

const defaultForm = {
  code: "",
  name: "",
  discountType: "PERCENT",
  discountValue: 10,
  minAmount: "",
  maxUses: "",
  maxUsesPerUser: "",
  startsAt: "",
  expiresAt: "",
  campaignType: "general",
  freeShipping: false,
  buyQuantity: "",
  getQuantity: "",
  orderScope: "all",
  description: "",
};

export default function KuponlarPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, expired: 0, totalUses: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/coupons");
    if (res.ok) {
      const data = await res.json();
      setCoupons(data.coupons);
      setStats(data.stats);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const handleEdit = (coupon: Coupon) => {
    setEditId(coupon.id);
    setForm({
      code: coupon.code,
      name: coupon.name || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minAmount: coupon.minAmount?.toString() || "",
      maxUses: coupon.maxUses?.toString() || "",
      maxUsesPerUser: coupon.maxUsesPerUser?.toString() || "",
      startsAt: coupon.startsAt ? coupon.startsAt.split("T")[0] : "",
      expiresAt: coupon.expiresAt ? coupon.expiresAt.split("T")[0] : "",
      campaignType: coupon.campaignType,
      freeShipping: coupon.freeShipping,
      buyQuantity: coupon.buyQuantity?.toString() || "",
      getQuantity: coupon.getQuantity?.toString() || "",
      orderScope: coupon.orderScope,
      description: coupon.description || "",
    });
    setShowForm(true);
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.code) { setError("Kupon kodu zorunludur."); return; }
    setSaving(true);
    setError("");

    const payload = {
      code: form.code.toUpperCase(),
      name: form.name || null,
      discountType: form.discountType,
      discountValue: form.discountValue,
      minAmount: form.minAmount ? parseFloat(form.minAmount) : null,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      maxUsesPerUser: form.maxUsesPerUser ? parseInt(form.maxUsesPerUser) : null,
      startsAt: form.startsAt || null,
      expiresAt: form.expiresAt || null,
      campaignType: form.campaignType,
      freeShipping: form.freeShipping,
      buyQuantity: form.buyQuantity ? parseInt(form.buyQuantity) : null,
      getQuantity: form.getQuantity ? parseInt(form.getQuantity) : null,
      orderScope: form.orderScope,
      description: form.description || null,
    };

    const url = editId ? `/api/admin/coupons/${editId}` : "/api/admin/coupons";
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowForm(false);
      setEditId(null);
      setForm(defaultForm);
      fetchCoupons();
    } else {
      const data = await res.json();
      setError(data.error || "Hata olustu");
    }
    setSaving(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    fetchCoupons();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kuponu silmek istediginize emin misiniz?")) return;
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    fetchCoupons();
  };

  const isExpired = (c: Coupon) => c.expiresAt && new Date(c.expiresAt) < new Date();
  const isNotStarted = (c: Coupon) => c.startsAt && new Date(c.startsAt) > new Date();

  const filtered = coupons.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.code.toLowerCase().includes(s) || (c.name || "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Kuponlar & Kampanyalar</h1>
          <p className="mt-1 text-[13px] text-gray-500">{stats.total} kupon kayitli, {stats.totalUses} toplam kullanim</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); setError(""); }}
          className="flex items-center gap-2 rounded-xl bg-[#7AC143] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#6aad38] hover:shadow-md active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Yeni Kupon
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
              <Ticket className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-gray-400">Toplam</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <Percent className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-gray-400">Aktif</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-gray-400">Suresi Dolmus</p>
              <p className="text-2xl font-bold text-red-500">{stats.expired}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-gray-400">Toplam Kullanim</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Kupon kodu veya kampanya adi ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/80 text-left">
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Kupon</th>
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Tur</th>
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Indirim</th>
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Min. Tutar</th>
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Kullanim</th>
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Kapsam</th>
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Tarih</th>
                <th className="px-5 py-3.5 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">Durum</th>
                <th className="px-5 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Islem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => {
                const cfg = CAMPAIGN_TYPES[c.campaignType] || CAMPAIGN_TYPES.general;
                const Icon = cfg.icon;
                const expired = isExpired(c);
                const notStarted = isNotStarted(c);
                return (
                  <tr key={c.id} className={`transition-colors hover:bg-gray-50/50 ${expired ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-mono text-[13px] font-semibold text-gray-900">{c.code}</p>
                        {c.name && <p className="mt-0.5 text-[12px] text-gray-400">{c.name}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${cfg.color}`}>
                        <Icon className="h-3 w-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium">
                      {c.campaignType === "free_shipping" ? (
                        <span className="text-green-600">Ucretsiz Kargo</span>
                      ) : c.campaignType === "buy_x_get_y" ? (
                        <span className="text-gray-900">{c.buyQuantity} Al {c.getQuantity} Ode</span>
                      ) : (
                        <span className="text-gray-900">{c.discountType === "PERCENT" ? `%${c.discountValue}` : `${c.discountValue} TL`}</span>
                      )}
                      {c.freeShipping && c.campaignType !== "free_shipping" && (
                        <span className="ml-1.5 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">+Kargo</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{c.minAmount ? `${c.minAmount} TL` : <span className="text-gray-300">--</span>}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-900">{c.currentUses}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-gray-500">{c.maxUses || <span className="text-[11px]">Sinirsiz</span>}</span>
                      </div>
                      {c.maxUsesPerUser && (
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                          <Users className="h-3 w-3" /> Kisi: {c.maxUsesPerUser}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                        c.orderScope === "all" ? "bg-gray-50 text-gray-600" :
                        c.orderScope === "retail" ? "bg-blue-50 text-blue-600" :
                        "bg-amber-50 text-amber-600"
                      }`}>
                        {c.orderScope === "all" ? "Tumu" : c.orderScope === "retail" ? "Perakende" : "Toptan"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-400">
                      {c.startsAt && <div>{new Date(c.startsAt).toLocaleDateString("tr-TR")}</div>}
                      {c.expiresAt && <div className="text-gray-400">&#8594; {new Date(c.expiresAt).toLocaleDateString("tr-TR")}</div>}
                      {!c.startsAt && !c.expiresAt && <span className="text-gray-300">--</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {expired ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                          <Clock className="h-3 w-3" /> Suresi Dolmus
                        </span>
                      ) : notStarted ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
                          <Clock className="h-3 w-3" /> Zamanlanmis
                        </span>
                      ) : (
                        <button onClick={() => handleToggle(c.id, c.active)} className="group">
                          <span className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            c.active
                              ? "bg-green-50 text-green-700 group-hover:bg-green-100"
                              : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${c.active ? "bg-green-500" : "bg-gray-400"}`} />
                            {c.active ? "Aktif" : "Pasif"}
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(c)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          title="Duzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
                        <Ticket className="h-6 w-6 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-400">Henuz kupon bulunmuyor</p>
                        <p className="mt-0.5 text-[12px] text-gray-300">Yeni bir kupon olusturmak icin yukaridaki butonu kullanin</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#7AC143]" />
          <span className="text-sm text-gray-400">Yukleniyor...</span>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditId(null); }}>
          <div
            className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7AC143]/10">
                  <Ticket className="h-5 w-5 text-[#7AC143]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-gray-900">{editId ? "Kupon Duzenle" : "Yeni Kupon"}</h2>
                  <p className="text-[12px] text-gray-400">{editId ? "Mevcut kuponu guncelle" : "Yeni bir kampanya kuponu olustur"}</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="space-y-5 p-6">
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Kupon Kodu <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-mono text-sm uppercase shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 disabled:bg-gray-50 disabled:text-gray-400"
                    placeholder="HOSGELDIN"
                    disabled={!!editId}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Kampanya Adi</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    placeholder="Yaz Kampanyasi"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Kampanya Turu</label>
                <select
                  value={form.campaignType}
                  onChange={(e) => setForm({ ...form, campaignType: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                >
                  {Object.entries(CAMPAIGN_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>

              {form.campaignType !== "free_shipping" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Indirim Tipi</label>
                    <select
                      value={form.discountType}
                      onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    >
                      <option value="PERCENT">Yuzde (%)</option>
                      <option value="FIXED">Sabit Tutar (TL)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Indirim Degeri <span className="text-red-400">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.discountValue}
                      onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    />
                  </div>
                </div>
              )}

              {form.campaignType === "buy_x_get_y" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Al (X)</label>
                    <input
                      type="number"
                      value={form.buyQuantity}
                      onChange={(e) => setForm({ ...form, buyQuantity: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Ode (Y)</label>
                    <input
                      type="number"
                      value={form.getQuantity}
                      onChange={(e) => setForm({ ...form, getQuantity: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      placeholder="2"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Min. Tutar (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.minAmount}
                    onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    placeholder="Yok"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Maks. Kullanim</label>
                  <input
                    type="number"
                    value={form.maxUses}
                    onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    placeholder="Sinirsiz"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Kisi Basi Limit</label>
                  <input
                    type="number"
                    value={form.maxUsesPerUser}
                    onChange={(e) => setForm({ ...form, maxUsesPerUser: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    placeholder="Sinirsiz"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Baslangic Tarihi</label>
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Bitis Tarihi</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Kapsam</label>
                  <select
                    value={form.orderScope}
                    onChange={(e) => setForm({ ...form, orderScope: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                  >
                    <option value="all">Tumu (Perakende + Toptan)</option>
                    <option value="retail">Sadece Perakende</option>
                    <option value="wholesale">Sadece Toptan</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors hover:border-gray-300">
                    <input
                      type="checkbox"
                      checked={form.freeShipping}
                      onChange={(e) => setForm({ ...form, freeShipping: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-[#7AC143] focus:ring-[#7AC143]/20"
                    />
                    <span className="text-sm text-gray-700">Ucretsiz Kargo Dahil</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Aciklama</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                  rows={2}
                  placeholder="Kampanya aciklamasi"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => { setShowForm(false); setEditId(null); }}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-800"
              >
                Iptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="rounded-xl bg-[#7AC143] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#6aad38] hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-sm"
              >
                {saving ? "Kaydediliyor..." : editId ? "Guncelle" : "Olustur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
