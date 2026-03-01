"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function AdminNewDealerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/dealers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push("/admin/bayiler");
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
