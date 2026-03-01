"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Plus, Trash2 } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minAmount: number | null;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  active: boolean;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountType: "PERCENT",
    discountValue: 10,
    minAmount: "",
    maxUses: "",
    expiresAt: "",
  });

  const fetchCoupons = () => {
    fetch("/api/admin/coupons")
      .then((r) => r.json())
      .then((data) => { setCoupons(data); setLoading(false); });
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        minAmount: form.minAmount ? parseFloat(form.minAmount) : null,
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      }),
    });
    setShowForm(false);
    setForm({ code: "", discountType: "PERCENT", discountValue: 10, minAmount: "", maxUses: "", expiresAt: "" });
    fetchCoupons();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    fetchCoupons();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    fetchCoupons();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kuponlar</h1>
          <p className="mt-1 text-sm text-gray-500">{coupons.length} kupon</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Kupon
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Yeni Kupon</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Kupon Kodu *</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full rounded-lg border px-3 py-2 text-sm font-mono uppercase focus:border-[#7AC143] focus:outline-none" placeholder="HOSGELDIN" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">İndirim Tipi</label>
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none">
                <option value="PERCENT">Yüzde (%)</option>
                <option value="FIXED">Sabit (₺)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">İndirim Değeri *</label>
              <input required type="number" step="0.01" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Min. Tutar (₺)</label>
              <input type="number" step="0.01" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" placeholder="Yok" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Maks. Kullanım</label>
              <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" placeholder="Sınırsız" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Son Geçerlilik</label>
              <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
            <Button type="submit">Oluştur</Button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Kod</th>
              <th className="px-4 py-3 font-medium text-gray-700">İndirim</th>
              <th className="px-4 py-3 font-medium text-gray-700">Min. Tutar</th>
              <th className="px-4 py-3 font-medium text-gray-700">Kullanım</th>
              <th className="px-4 py-3 font-medium text-gray-700">Son Tarih</th>
              <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
              <th className="px-4 py-3 font-medium text-gray-700">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {coupons.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium text-gray-900">{c.code}</td>
                <td className="px-4 py-3">
                  {c.discountType === "PERCENT" ? `%${c.discountValue}` : `${c.discountValue} ₺`}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {c.minAmount ? `${c.minAmount} ₺` : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {c.currentUses}/{c.maxUses || "∞"}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("tr-TR") : "—"}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(c.id, c.active)}>
                    <Badge variant={c.active ? "success" : "outline"} className="cursor-pointer">
                      {c.active ? "Aktif" : "Pasif"}
                    </Badge>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(c.id)} className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Henüz kupon yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
