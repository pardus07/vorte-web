"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Send, CheckCircle } from "lucide-react";

export default function DealerApplicationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
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
    shopCity: "",
    shopDistrict: "",
    shopAddress: "",
    estimatedMonthlyOrder: "",
    notes: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/dealer-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || "Bir hata oluştu");
      }
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    }
    setSaving(false);
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h3 className="mt-4 text-xl font-bold text-green-800">Başvurunuz Alındı!</h3>
        <p className="mt-2 text-sm text-green-700">
          Başvurunuz incelendikten sonra tarafınıza e-posta ile bilgilendirme yapılacaktır.
          En kısa sürede sizinle iletişime geçeceğiz.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Firma Bilgileri */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Firma Bilgileri</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Firma Ünvanı *</label>
            <input required value={form.companyName} onChange={(e) => update("companyName", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Vergi Numarası *</label>
            <input required value={form.taxNumber} onChange={(e) => update("taxNumber", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" placeholder="10 haneli" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Vergi Dairesi *</label>
            <input required value={form.taxOffice} onChange={(e) => update("taxOffice", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" />
          </div>
        </div>
      </div>

      {/* İletişim */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Yetkili Bilgileri</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Yetkili Adı Soyadı *</label>
            <input required value={form.contactName} onChange={(e) => update("contactName", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Telefon *</label>
            <input required type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" placeholder="0532 XXX XX XX" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">E-posta *</label>
            <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" />
          </div>
        </div>
      </div>

      {/* Adres */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Teslimat Adresi</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">İl *</label>
            <input required value={form.city} onChange={(e) => update("city", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">İlçe *</label>
            <input required value={form.district} onChange={(e) => update("district", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Açık Adres *</label>
            <textarea required rows={2} value={form.address} onChange={(e) => update("address", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" />
          </div>
        </div>
      </div>

      {/* Dükkan */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Fiziki Dükkan Bilgileri <span className="text-sm font-normal text-gray-400">(İsteğe Bağlı)</span></h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Dükkan İl</label>
            <input value={form.shopCity} onChange={(e) => update("shopCity", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Dükkan İlçe</label>
            <input value={form.shopDistrict} onChange={(e) => update("shopDistrict", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Dükkan Adresi</label>
            <textarea rows={2} value={form.shopAddress} onChange={(e) => update("shopAddress", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" />
          </div>
        </div>
      </div>

      {/* Ek Bilgi */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Ek Bilgiler</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tahmini Aylık Sipariş Adedi</label>
            <select value={form.estimatedMonthlyOrder} onChange={(e) => update("estimatedMonthlyOrder", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]">
              <option value="">Seçiniz</option>
              <option value="1-5 düzine">1-5 düzine</option>
              <option value="5-10 düzine">5-10 düzine</option>
              <option value="10-25 düzine">10-25 düzine</option>
              <option value="25+ düzine">25+ düzine</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notlarınız</label>
            <textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" placeholder="Eklemek istediğiniz bilgiler..." />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={saving}>
          <Send className="mr-2 h-4 w-4" />
          Başvuru Gönder
        </Button>
      </div>
    </form>
  );
}
