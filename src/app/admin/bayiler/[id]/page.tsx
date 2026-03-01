"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

interface DealerData {
  id: string;
  companyName: string;
  taxNumber: string;
  taxOffice: string;
  dealerCode: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  address: string;
  status: string;
}

export default function AdminDealerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealerId = params.id as string;
  const [dealer, setDealer] = useState<DealerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/dealers/${dealerId}`)
      .then((r) => r.json())
      .then((d) => { setDealer(d); setLoading(false); });
  }, [dealerId]);

  if (loading || !dealer) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/dealers/${dealerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dealer),
      });
      if (res.ok) router.push("/admin/bayiler");
    } finally {
      setSaving(false);
    }
  };

  const update = (field: string, value: string) =>
    setDealer((prev) => prev ? { ...prev, [field]: value } : prev);

  return (
    <div>
      <div className="flex items-center gap-4">
        <Link href="/admin/bayiler" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{dealer.companyName}</h1>
          <p className="text-sm text-gray-500">Kod: {dealer.dealerCode}</p>
        </div>
        <Badge
          variant={dealer.status === "ACTIVE" ? "success" : dealer.status === "PENDING" ? "warning" : "discount"}
          className="ml-auto"
        >
          {dealer.status === "ACTIVE" ? "Aktif" : dealer.status === "PENDING" ? "Bekliyor" : "Askıda"}
        </Badge>
      </div>

      <div className="mt-6 space-y-6">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Firma Bilgileri</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Firma Adı</label>
              <input value={dealer.companyName} onChange={(e) => update("companyName", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Vergi No</label>
              <input value={dealer.taxNumber} onChange={(e) => update("taxNumber", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Vergi Dairesi</label>
              <input value={dealer.taxOffice} onChange={(e) => update("taxOffice", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Durum</label>
              <select value={dealer.status} onChange={(e) => update("status", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none">
                <option value="ACTIVE">Aktif</option>
                <option value="PENDING">Bekliyor</option>
                <option value="SUSPENDED">Askıda</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">İletişim</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Yetkili</label>
              <input value={dealer.contactName} onChange={(e) => update("contactName", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefon</label>
              <input value={dealer.phone} onChange={(e) => update("phone", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">E-posta</label>
              <input value={dealer.email} onChange={(e) => update("email", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Adres</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Şehir</label>
              <input value={dealer.city} onChange={(e) => update("city", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">İlçe</label>
              <input value={dealer.district} onChange={(e) => update("district", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Adres</label>
              <textarea rows={3} value={dealer.address} onChange={(e) => update("address", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/admin/bayiler">
            <Button variant="outline">İptal</Button>
          </Link>
          <Button onClick={handleSave} loading={saving}>
            <Save className="mr-2 h-4 w-4" />
            Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}
