"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Edit, Tag, Search, Gift, Truck, ShoppingBag, Percent, Clock } from "lucide-react";

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
  general: { label: "Genel İndirim", icon: Percent, color: "bg-blue-100 text-blue-700" },
  free_shipping: { label: "Ücretsiz Kargo", icon: Truck, color: "bg-green-100 text-green-700" },
  buy_x_get_y: { label: "X Al Y Öde", icon: Gift, color: "bg-purple-100 text-purple-700" },
  first_order: { label: "İlk Sipariş", icon: ShoppingBag, color: "bg-orange-100 text-orange-700" },
  product_specific: { label: "Ürün Bazlı", icon: Tag, color: "bg-cyan-100 text-cyan-700" },
  category_specific: { label: "Kategori Bazlı", icon: Tag, color: "bg-yellow-100 text-yellow-700" },
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
      setError(data.error || "Hata oluştu");
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
    if (!confirm("Bu kuponu silmek istediğinize emin misiniz?")) return;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kuponlar & Kampanyalar</h1>
          <p className="mt-1 text-sm text-gray-500">{stats.total} kupon · {stats.totalUses} toplam kullanım</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); setError(""); }}
          className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6aad38]"
        >
          <Plus className="h-4 w-4" /> Yeni Kupon
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">Toplam</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">Aktif</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">Süresi Dolmuş</p>
          <p className="mt-1 text-2xl font-bold text-red-500">{stats.expired}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">Toplam Kullanım</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalUses}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Kupon kodu veya kampanya adı ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input w-full pl-10"
        />
      </div>

      <div className="rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Kupon</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 font-medium">İndirim</th>
                <th className="px-4 py-3 font-medium">Min. Tutar</th>
                <th className="px-4 py-3 font-medium">Kullanım</th>
                <th className="px-4 py-3 font-medium">Kapsam</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium text-center">Durum</th>
                <th className="px-4 py-3 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const cfg = CAMPAIGN_TYPES[c.campaignType] || CAMPAIGN_TYPES.general;
                const Icon = cfg.icon;
                const expired = isExpired(c);
                const notStarted = isNotStarted(c);
                return (
                  <tr key={c.id} className={`border-b hover:bg-gray-50 ${expired ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono font-medium text-gray-900">{c.code}</p>
                        {c.name && <p className="text-xs text-gray-400">{c.name}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                        <Icon className="h-3 w-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {c.campaignType === "free_shipping" ? (
                        <span className="text-green-600">Ücretsiz Kargo</span>
                      ) : c.campaignType === "buy_x_get_y" ? (
                        <span>{c.buyQuantity} Al {c.getQuantity} Öde</span>
                      ) : (
                        <span>{c.discountType === "PERCENT" ? `%${c.discountValue}` : `₺${c.discountValue}`}</span>
                      )}
                      {c.freeShipping && c.campaignType !== "free_shipping" && (
                        <span className="ml-1 text-[10px] text-green-500">+Kargo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.minAmount ? `₺${c.minAmount}` : "—"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.currentUses}/{c.maxUses || "∞"}
                      {c.maxUsesPerUser && <span className="text-xs text-gray-400"> (kişi: {c.maxUsesPerUser})</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">
                        {c.orderScope === "all" ? "Tümü" : c.orderScope === "retail" ? "Perakende" : "Toptan"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {c.startsAt && <div>{new Date(c.startsAt).toLocaleDateString("tr-TR")}</div>}
                      {c.expiresAt && <div>→ {new Date(c.expiresAt).toLocaleDateString("tr-TR")}</div>}
                      {!c.startsAt && !c.expiresAt && "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {expired ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
                          <Clock className="h-3 w-3" /> Süresi Dolmuş
                        </span>
                      ) : notStarted ? (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700">Zamanlanmış</span>
                      ) : (
                        <button onClick={() => handleToggle(c.id, c.active)}>
                          <span className={`cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-medium ${c.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {c.active ? "Aktif" : "Pasif"}
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(c)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-gray-400">Henüz kupon bulunmuyor</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {loading && <div className="py-10 text-center text-gray-400">Yükleniyor...</div>}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">{editId ? "Kupon Düzenle" : "Yeni Kupon"}</h2>
            </div>
            <div className="space-y-4 p-6">
              {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Kupon Kodu *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="form-input w-full font-mono uppercase"
                    placeholder="HOSGELDIN"
                    disabled={!!editId}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Kampanya Adı</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="form-input w-full"
                    placeholder="Yaz Kampanyası"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Kampanya Türü</label>
                <select
                  value={form.campaignType}
                  onChange={(e) => setForm({ ...form, campaignType: e.target.value })}
                  className="form-input w-full"
                >
                  {Object.entries(CAMPAIGN_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>

              {form.campaignType !== "free_shipping" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">İndirim Tipi</label>
                    <select
                      value={form.discountType}
                      onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                      className="form-input w-full"
                    >
                      <option value="PERCENT">Yüzde (%)</option>
                      <option value="FIXED">Sabit Tutar (₺)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">İndirim Değeri *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.discountValue}
                      onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })}
                      className="form-input w-full"
                    />
                  </div>
                </div>
              )}

              {form.campaignType === "buy_x_get_y" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Al (X)</label>
                    <input type="number" value={form.buyQuantity} onChange={(e) => setForm({ ...form, buyQuantity: e.target.value })} className="form-input w-full" placeholder="3" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Öde (Y)</label>
                    <input type="number" value={form.getQuantity} onChange={(e) => setForm({ ...form, getQuantity: e.target.value })} className="form-input w-full" placeholder="2" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Min. Tutar (₺)</label>
                  <input type="number" step="0.01" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} className="form-input w-full" placeholder="Yok" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Maks. Kullanım</label>
                  <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} className="form-input w-full" placeholder="Sınırsız" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Kişi Başı Limit</label>
                  <input type="number" value={form.maxUsesPerUser} onChange={(e) => setForm({ ...form, maxUsesPerUser: e.target.value })} className="form-input w-full" placeholder="Sınırsız" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
                  <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="form-input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
                  <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="form-input w-full" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Kapsam</label>
                  <select value={form.orderScope} onChange={(e) => setForm({ ...form, orderScope: e.target.value })} className="form-input w-full">
                    <option value="all">Tümü (Perakende + Toptan)</option>
                    <option value="retail">Sadece Perakende</option>
                    <option value="wholesale">Sadece Toptan</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 pb-2">
                    <input type="checkbox" checked={form.freeShipping} onChange={(e) => setForm({ ...form, freeShipping: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-[#7AC143]" />
                    <span className="text-sm text-gray-700">Ücretsiz Kargo Dahil</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Açıklama</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="form-input w-full" rows={2} placeholder="Kampanya açıklaması" />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
              <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-[#7AC143] px-6 py-2 text-sm font-medium text-white hover:bg-[#6aad38] disabled:opacity-50">
                {saving ? "Kaydediliyor..." : editId ? "Güncelle" : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
