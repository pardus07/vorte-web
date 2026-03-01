"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Save, Truck } from "lucide-react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "PENDING", label: "Bekliyor" },
  { value: "PAID", label: "Ödendi" },
  { value: "PROCESSING", label: "Hazırlanıyor" },
  { value: "SHIPPED", label: "Kargoda" },
  { value: "DELIVERED", label: "Teslim Edildi" },
  { value: "CANCELLED", label: "İptal" },
  { value: "REFUNDED", label: "İade" },
];

export function OrderStatusForm({
  orderId,
  currentStatus,
  cargoTrackingNo,
  cargoProvider,
}: {
  orderId: string;
  currentStatus: string;
  cargoTrackingNo: string;
  cargoProvider: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [tracking, setTracking] = useState(cargoTrackingNo);
  const [provider, setProvider] = useState(cargoProvider);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          cargoTrackingNo: tracking || null,
          cargoProvider: provider || null,
        }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-lg font-bold text-gray-900">Durum Güncelle</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Sipariş Durumu</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Kargo Firması</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
          >
            <option value="">Seçiniz</option>
            <option value="Yurtiçi Kargo">Yurtiçi Kargo</option>
            <option value="Aras Kargo">Aras Kargo</option>
            <option value="MNG Kargo">MNG Kargo</option>
            <option value="PTT Kargo">PTT Kargo</option>
            <option value="Sürat Kargo">Sürat Kargo</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            <Truck className="mr-1 inline h-4 w-4" />
            Kargo Takip No
          </label>
          <input
            type="text"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Kargo takip numarasını girin"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          <Save className="mr-2 h-4 w-4" />
          Güncelle
        </Button>
      </div>
    </div>
  );
}
