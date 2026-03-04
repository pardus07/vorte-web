"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Save,
  Truck,
  FileText,
  RotateCcw,
  StickyNote,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
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

interface OrderItem {
  id: string;
  name: string;
  color: string;
  size: string;
  quantity: number;
  totalPrice: number;
}

interface OrderActionsProps {
  orderId: string;
  currentStatus: string;
  cargoTrackingNo: string;
  cargoProvider: string;
  adminNotes: string;
  hasInvoice: boolean;
  hasShipment: boolean;
  paymentStatus: string;
  orderItems: OrderItem[];
}

export function OrderActions({
  orderId,
  currentStatus,
  cargoTrackingNo,
  cargoProvider,
  adminNotes: initialNotes,
  hasInvoice,
  hasShipment,
  paymentStatus,
  orderItems,
}: OrderActionsProps) {
  const router = useRouter();

  // Status update
  const [status, setStatus] = useState(currentStatus);
  const [statusNote, setStatusNote] = useState("");
  const [tracking, setTracking] = useState(cargoTrackingNo);
  const [provider, setProvider] = useState(cargoProvider);
  const [savingStatus, setSavingStatus] = useState(false);

  // Admin notes
  const [notes, setNotes] = useState(initialNotes);
  const [savingNotes, setSavingNotes] = useState(false);

  // Shipping
  const [shipping, setShipping] = useState(false);

  // Invoice
  const [invoicing, setInvoicing] = useState(false);

  // Refund
  const [showRefund, setShowRefund] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [selectedRefundItems, setSelectedRefundItems] = useState<Set<string>>(new Set());
  const [refunding, setRefunding] = useState(false);

  // Messages
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess("");
    } else {
      setSuccess(msg);
      setError("");
    }
    setTimeout(() => { setSuccess(""); setError(""); }, 4000);
  };

  const handleStatusUpdate = async () => {
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          statusNote: statusNote || undefined,
          cargoTrackingNo: tracking || null,
          cargoProvider: provider || null,
        }),
      });

      if (res.ok) {
        showMessage("Sipariş durumu güncellendi");
        setStatusNote("");
        router.refresh();
      } else {
        const data = await res.json();
        showMessage(data.error || "Güncelleme başarısız", true);
      }
    } catch {
      showMessage("Bir hata oluştu", true);
    }
    setSavingStatus(false);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes: notes }),
      });

      if (res.ok) {
        showMessage("Notlar kaydedildi");
      } else {
        showMessage("Not kaydetme başarısız", true);
      }
    } catch {
      showMessage("Bir hata oluştu", true);
    }
    setSavingNotes(false);
  };

  const handleCreateShipment = async () => {
    setShipping(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/ship`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(`Kargo oluşturuldu: ${data.carrier} - ${data.trackingNo}`);
        setTracking(data.trackingNo);
        setProvider(data.carrier);
        setStatus("SHIPPED");
        router.refresh();
      } else {
        showMessage(data.error || "Kargo oluşturulamadı", true);
      }
    } catch {
      showMessage("Kargo oluşturma hatası", true);
    }
    setShipping(false);
  };

  const handleCreateInvoice = async () => {
    setInvoicing(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/invoice`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(`Fatura kesildi: ${data.invoiceNo}`);
        router.refresh();
      } else {
        showMessage(data.error || "Fatura kesilemedi", true);
      }
    } catch {
      showMessage("Fatura kesme hatası", true);
    }
    setInvoicing(false);
  };

  const handleRefund = async () => {
    if (!refundReason) {
      showMessage("İade nedeni giriniz", true);
      return;
    }

    setRefunding(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: selectedRefundItems.size > 0 ? Array.from(selectedRefundItems) : undefined,
          reason: refundReason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const formatTRY = (n: number) =>
          new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
        showMessage(
          `İade işlemi tamamlandı: ${data.itemCount} ürün, ${formatTRY(data.refundAmount)}${data.isFullRefund ? " (Tam iade)" : ""}`
        );
        setShowRefund(false);
        setRefundReason("");
        setSelectedRefundItems(new Set());
        router.refresh();
      } else {
        showMessage(data.error || "İade işlemi başarısız", true);
      }
    } catch {
      showMessage("İade hatası", true);
    }
    setRefunding(false);
  };

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

  const canShip = ["PAID", "PROCESSING"].includes(currentStatus) && !hasShipment;
  const canInvoice = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(currentStatus) && !hasInvoice;
  const canRefund = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(currentStatus) && paymentStatus === "SUCCESS";

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>}

      {/* Status Update */}
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
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              <Truck className="mr-1 inline h-4 w-4" />
              Kargo Takip No
            </label>
            <input
              type="text"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Kargo takip numarası"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Durum Notu (Opsiyonel)</label>
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Durum değişikliği ile ilgili not"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleStatusUpdate} loading={savingStatus}>
            <Save className="mr-2 h-4 w-4" />
            Güncelle
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Hızlı İşlemler</h2>
        <div className="flex flex-wrap gap-3">
          {/* Create Shipment */}
          <Button
            onClick={handleCreateShipment}
            loading={shipping}
            disabled={!canShip}
            variant={canShip ? "default" : "outline"}
          >
            <Truck className="mr-2 h-4 w-4" />
            {hasShipment ? "Kargo Mevcut" : "Kargo Oluştur"}
          </Button>

          {/* Create Invoice */}
          <Button
            onClick={handleCreateInvoice}
            loading={invoicing}
            disabled={!canInvoice}
            variant={canInvoice ? "default" : "outline"}
          >
            <FileText className="mr-2 h-4 w-4" />
            {hasInvoice ? "Fatura Mevcut" : "Fatura Kes"}
          </Button>

          {/* Refund */}
          <Button
            onClick={() => setShowRefund(!showRefund)}
            disabled={!canRefund}
            variant="destructive"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            İade Başlat
          </Button>
        </div>

        {/* Action Status Messages */}
        {hasShipment && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Kargo oluşturuldu: {cargoProvider} — {cargoTrackingNo}
          </div>
        )}
        {hasInvoice && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Fatura kesilmiş
          </div>
        )}
      </div>

      {/* Refund Panel */}
      {showRefund && (
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-bold">İade İşlemi</h2>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            İade edilecek ürünleri seçin veya hiçbir ürün seçmezseniz tüm sipariş iade edilir.
          </p>

          {/* Item Selection */}
          <div className="mt-4 space-y-2">
            {orderItems.map((item) => (
              <label key={item.id} className="flex items-center gap-3 rounded-lg border bg-white p-3 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedRefundItems.has(item.id)}
                  onChange={() => {
                    const next = new Set(selectedRefundItems);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    setSelectedRefundItems(next);
                  }}
                  className="rounded border-gray-300"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.color} / {item.size} · {item.quantity} adet</p>
                </div>
                <span className="text-sm font-medium text-gray-900">{formatPrice(item.totalPrice)}</span>
              </label>
            ))}
          </div>

          {/* Refund Reason */}
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">İade Nedeni *</label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="İade nedenini yazın..."
              rows={2}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {selectedRefundItems.size === 0
                ? "Tüm sipariş iade edilecek"
                : `${selectedRefundItems.size} ürün iade edilecek`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowRefund(false)}>İptal</Button>
              <Button variant="destructive" size="sm" onClick={handleRefund} loading={refunding}>
                <RotateCcw className="mr-2 h-4 w-4" />
                İade Et
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Notes */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
          <StickyNote className="h-5 w-5 text-gray-400" />
          Admin Notları
        </h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Siparişle ilgili iç notlar yazabilirsiniz..."
          rows={3}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
        />
        <div className="mt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleSaveNotes} loading={savingNotes}>
            <Save className="mr-2 h-4 w-4" />
            Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}
