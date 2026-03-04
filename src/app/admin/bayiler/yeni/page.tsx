"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function AdminNewDealerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    taxNumber: "",
    taxOffice: "",
    contactName: "",
    phone: "",
    email: "",
    city: "",
    district: "",
    address: "",
    password: "",
    dealerTier: "standard",
    discountRate: "",
    creditLimit: "",
    paymentTermDays: "0",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        discountRate: form.discountRate ? parseFloat(form.discountRate) : undefined,
        creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : undefined,
        paymentTermDays: parseInt(form.paymentTermDays) || 0,
      };
      const res = await fetch("/api/admin/dealers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.push("/admin/bayiler");
      } else {
        const data = await res.json();
        setError(data.error || "Bir hata oluştu");
      }
    } finally {
      setSaving(false);
    }
  };

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div>
      <div className="flex items-center gap-4">
        <Link href="/admin/bayiler" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Yeni Bayi</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Firma Bilgileri</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Firma Adı *</label>
              <input
                required
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Vergi No *</label>
              <input
                required
                value={form.taxNumber}
                onChange={(e) => update("taxNumber", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Vergi Dairesi *</label>
              <input
                required
                value={form.taxOffice}
                onChange={(e) => update("taxOffice", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Şifre *</label>
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
                placeholder="Bayi giriş şifresi"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">İletişim Bilgileri</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Yetkili Adı *</label>
              <input
                required
                value={form.contactName}
                onChange={(e) => update("contactName", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefon *</label>
              <input
                required
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">E-posta *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Adres</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Şehir *</label>
              <input
                required
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">İlçe *</label>
              <input
                required
                value={form.district}
                onChange={(e) => update("district", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Adres *</label>
              <textarea
                required
                rows={3}
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Ticari Koşullar</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Seviye</label>
              <select
                value={form.dealerTier}
                onChange={(e) => update("dealerTier", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              >
                <option value="standard">Standard</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">İskonto Oranı (%)</label>
              <input
                type="number"
                value={form.discountRate}
                onChange={(e) => update("discountRate", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
                placeholder="Örn: 15"
                step="0.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Cari Limit (₺)</label>
              <input
                type="number"
                value={form.creditLimit}
                onChange={(e) => update("creditLimit", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
                placeholder="Örn: 50000"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Vade Günü</label>
              <input
                type="number"
                value={form.paymentTermDays}
                onChange={(e) => update("paymentTermDays", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
                placeholder="0 = Peşin"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Admin Notları</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
                placeholder="İç notlar (bayiye gösterilmez)"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/admin/bayiler">
            <Button variant="outline" type="button">İptal</Button>
          </Link>
          <Button type="submit" loading={saving}>
            <Save className="mr-2 h-4 w-4" />
            Bayi Oluştur
          </Button>
        </div>
      </form>
    </div>
  );
}
