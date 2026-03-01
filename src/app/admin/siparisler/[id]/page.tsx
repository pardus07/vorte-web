import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { OrderStatusForm } from "./OrderStatusForm";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "success" | "warning" | "outline" | "discount" | "new" }> = {
  PENDING: { label: "Bekliyor", variant: "warning" },
  PAID: { label: "Ödendi", variant: "success" },
  PROCESSING: { label: "Hazırlanıyor", variant: "new" },
  SHIPPED: { label: "Kargoda", variant: "default" },
  DELIVERED: { label: "Teslim Edildi", variant: "success" },
  CANCELLED: { label: "İptal", variant: "discount" },
  REFUNDED: { label: "İade", variant: "outline" },
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      dealer: { select: { companyName: true, dealerCode: true, contactName: true, phone: true } },
      items: {
        include: {
          product: { select: { name: true, images: true } },
          variant: { select: { color: true, size: true, sku: true } },
        },
      },
      payment: true,
      invoice: true,
    },
  });

  if (!order) notFound();

  const statusInfo = STATUS_MAP[order.status] || { label: order.status, variant: "outline" as const };
  const address = order.addressSnapshot as { fullName?: string; phone?: string; city?: string; district?: string; address?: string };

  return (
    <div>
      <div className="flex items-center gap-4">
        <Link href="/admin/siparisler" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Sipariş #{order.orderNumber}
          </h1>
          <p className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleString("tr-TR")}
          </p>
        </div>
        <Badge variant={statusInfo.variant} className="ml-auto text-sm">
          {statusInfo.label}
        </Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Order items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Ürünler</h2>
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  <div className="h-12 w-12 rounded bg-gray-100" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.variant.color} / {item.variant.size} — SKU: {item.variant.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{item.quantity} adet</p>
                    <p className="font-medium">{formatPrice(item.totalPrice)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Ara Toplam</span>
                <span>{formatPrice(order.totalAmount - order.shippingCost + order.discountAmount)}</span>
              </div>
              {order.shippingCost > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Kargo</span>
                  <span>{formatPrice(order.shippingCost)}</span>
                </div>
              )}
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>İndirim</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900">
                <span>Toplam</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Status update form */}
          <OrderStatusForm orderId={order.id} currentStatus={order.status} cargoTrackingNo={order.cargoTrackingNo || ""} cargoProvider={order.cargoProvider || ""} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-3 font-bold text-gray-900">
              {order.type === "WHOLESALE" ? "Bayi Bilgileri" : "Müşteri Bilgileri"}
            </h3>
            {order.dealer ? (
              <div className="space-y-1 text-sm text-gray-600">
                <p className="font-medium text-gray-900">{order.dealer.companyName}</p>
                <p>Kod: {order.dealer.dealerCode}</p>
                <p>{order.dealer.contactName}</p>
                <p>{order.dealer.phone}</p>
              </div>
            ) : (
              <div className="space-y-1 text-sm text-gray-600">
                <p className="font-medium text-gray-900">{order.user?.name || "Misafir"}</p>
                <p>{order.user?.email}</p>
                <p>{order.user?.phone}</p>
              </div>
            )}
          </div>

          {/* Address */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-3 font-bold text-gray-900">Teslimat Adresi</h3>
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900">{address.fullName}</p>
              <p>{address.phone}</p>
              <p className="mt-1">{address.address}</p>
              <p>{address.district} / {address.city}</p>
            </div>
          </div>

          {/* Payment */}
          {order.payment && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-3 font-bold text-gray-900">Ödeme</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Durum: <Badge variant={order.payment.status === "SUCCESS" ? "success" : "warning"} className="text-[10px]">{order.payment.status}</Badge></p>
                <p>Tutar: {formatPrice(order.payment.amount)}</p>
                {order.payment.paidAt && (
                  <p>Tarih: {new Date(order.payment.paidAt).toLocaleString("tr-TR")}</p>
                )}
              </div>
            </div>
          )}

          {/* Invoice */}
          {order.invoice && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-3 font-bold text-gray-900">Fatura</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>No: {order.invoice.invoiceNo || "—"}</p>
                <p>Durum: {order.invoice.status}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
