export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Star,
  RotateCcw,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string; step: number }> = {
  PENDING: { label: "Bekliyor", color: "bg-yellow-100 text-yellow-700", step: 0 },
  PAID: { label: "Ödendi", color: "bg-green-100 text-green-700", step: 1 },
  PROCESSING: { label: "Hazırlanıyor", color: "bg-blue-100 text-blue-700", step: 2 },
  SHIPPED: { label: "Kargoda", color: "bg-purple-100 text-purple-700", step: 3 },
  DELIVERED: { label: "Teslim Edildi", color: "bg-green-100 text-green-700", step: 4 },
  CANCELLED: { label: "İptal Edildi", color: "bg-red-100 text-red-700", step: -1 },
  REFUNDED: { label: "İade Edildi", color: "bg-gray-100 text-gray-700", step: -1 },
};

const TIMELINE_STEPS = [
  { key: "PENDING", label: "Sipariş Alındı", icon: Clock },
  { key: "PAID", label: "Ödeme Onayı", icon: CreditCard },
  { key: "PROCESSING", label: "Hazırlanıyor", icon: Package },
  { key: "SHIPPED", label: "Kargoya Verildi", icon: Truck },
  { key: "DELIVERED", label: "Teslim Edildi", icon: CheckCircle },
];

export default async function CustomerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const order = await db.order.findUnique({
    where: { id, userId: session.user.id },
    include: {
      items: {
        include: {
          product: { select: { name: true, slug: true, images: true } },
          variant: { select: { color: true, colorHex: true, size: true, sku: true } },
        },
      },
      payment: true,
      invoice: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) notFound();

  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "bg-gray-100 text-gray-600", step: 0 };
  const currentStep = statusInfo.step;
  const address = order.addressSnapshot as Record<string, string> | null;
  const isDelivered = order.status === "DELIVERED";
  const deliveredAt = order.statusHistory.find((h) => h.toStatus === "DELIVERED")?.createdAt;
  const canReturn = isDelivered && deliveredAt && Date.now() - new Date(deliveredAt).getTime() < 14 * 24 * 60 * 60 * 1000;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: "Hesabım", href: "/hesabim" },
          { label: "Siparişlerim", href: "/hesabim/siparislerim" },
          { label: `#${order.orderNumber}` },
        ]}
      />

      <Link href="/hesabim/siparislerim" className="mt-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#7AC143]">
        <ArrowLeft className="h-4 w-4" />
        Siparişlere Dön
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sipariş #{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Status Timeline */}
      {currentStep >= 0 && (
        <div className="mt-6 rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            {TIMELINE_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = currentStep >= i;
              const isCurrent = currentStep === i;
              return (
                <div key={step.key} className="flex flex-1 flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isCurrent
                        ? "bg-[#7AC143] text-white ring-4 ring-[#7AC143]/20"
                        : isActive
                          ? "bg-[#7AC143] text-white"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className={`mt-2 text-[11px] font-medium ${isActive ? "text-gray-900" : "text-gray-400"}`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancelled/Refunded */}
      {currentStep < 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <XCircle className="h-6 w-6 text-red-500" />
          <div>
            <p className="font-medium text-red-700">{statusInfo.label}</p>
            <p className="text-sm text-red-500">Bu sipariş iptal edildi veya iade edildi.</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2 rounded-lg border bg-white">
          <div className="border-b px-4 py-3">
            <h2 className="flex items-center gap-2 font-bold text-gray-900">
              <Package className="h-4 w-4 text-gray-400" />
              Ürünler ({order.items.length} kalem)
            </h2>
          </div>
          <div className="divide-y">
            {order.items.map((item) => {
              const img = (item.product.images as string[])?.[0];
              return (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    {img ? (
                      <div
                        className="h-16 w-16 flex-shrink-0 rounded bg-gray-100 bg-cover bg-center"
                        style={{ backgroundImage: `url(${img})` }}
                      />
                    ) : (
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded bg-gray-100">
                        <Package className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link href={`/urun/${item.product.slug}`} className="font-medium text-gray-900 hover:text-[#7AC143]">
                        {item.product.name}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {item.variant.color} · {item.variant.size}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {item.quantity} × {formatPrice(item.unitPrice)}
                      </p>
                      <p className="font-medium text-gray-900">{formatPrice(item.totalPrice)}</p>
                    </div>
                  </div>
                  {/* Action buttons for delivered orders */}
                  {isDelivered && (
                    <div className="mt-2 flex gap-3 pl-20">
                      <Link
                        href={`/hesabim/yorumlarim?urun=${item.productId}`}
                        className="inline-flex items-center gap-1 text-xs text-[#7AC143] hover:underline"
                      >
                        <Star className="h-3 w-3" />
                        Yorum Yap
                      </Link>
                      {canReturn && (
                        <Link
                          href={`/hesabim/iadelerim?siparis=${order.id}&urun=${item.id}`}
                          className="inline-flex items-center gap-1 text-xs text-orange-500 hover:underline"
                        >
                          <RotateCcw className="h-3 w-3" />
                          İade Talebi
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t px-4 py-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Ara Toplam</span>
              <span>{formatPrice(order.totalAmount - order.shippingCost + order.discountAmount)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="mt-1 flex justify-between text-sm text-green-600">
                <span>İndirim</span>
                <span>-{formatPrice(order.discountAmount)}</span>
              </div>
            )}
            {order.shippingCost > 0 && (
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-gray-500">Kargo</span>
                <span>{formatPrice(order.shippingCost)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t pt-2 text-lg font-bold">
              <span>Toplam</span>
              <span className="text-[#7AC143]">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Right Side Info */}
        <div className="space-y-4">
          {/* Cargo Info */}
          {order.cargoTrackingNo && (
            <div className="rounded-lg border bg-white p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Truck className="h-4 w-4 text-purple-500" />
                Kargo Bilgileri
              </h3>
              <div className="mt-3 space-y-2 text-sm">
                {order.cargoProvider && (
                  <div>
                    <p className="text-xs text-gray-500">Kargo Firması</p>
                    <p className="font-medium text-gray-900">{order.cargoProvider}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Takip Numarası</p>
                  <p className="font-mono font-medium text-[#7AC143]">{order.cargoTrackingNo}</p>
                </div>
              </div>
            </div>
          )}

          {/* Address */}
          {address && (
            <div className="rounded-lg border bg-white p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <MapPin className="h-4 w-4 text-blue-500" />
                Teslimat Adresi
              </h3>
              <div className="mt-3 text-sm text-gray-600">
                <p>{address.fullName}</p>
                <p className="mt-1">{address.address}</p>
                <p>
                  {address.district} / {address.city}
                </p>
                {address.phone && <p className="mt-1 text-gray-400">{address.phone}</p>}
              </div>
            </div>
          )}

          {/* Payment */}
          {order.payment && (
            <div className="rounded-lg border bg-white p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <CreditCard className="h-4 w-4 text-green-500" />
                Ödeme Bilgileri
              </h3>
              <div className="mt-3 text-sm text-gray-600">
                <p>
                  Durum:{" "}
                  <span className="font-medium text-gray-900">
                    {order.payment.status === "SUCCESS" ? "Ödendi" : order.payment.status === "PENDING" ? "Bekliyor" : order.payment.status}
                  </span>
                </p>
                <p className="mt-1">
                  Tutar: <span className="font-medium text-gray-900">{formatPrice(order.payment.amount)}</span>
                </p>
              </div>
            </div>
          )}

          {/* Invoice */}
          {order.invoice && (
            <div className="rounded-lg border bg-white p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <FileText className="h-4 w-4 text-orange-500" />
                Fatura
              </h3>
              <div className="mt-3 text-sm">
                <p className="text-gray-500">
                  Fatura No: <span className="font-medium text-gray-900">{order.invoice.invoiceNo || "—"}</span>
                </p>
              </div>
            </div>
          )}

          {/* Order Notes */}
          {order.notes && (
            <div className="rounded-lg border bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900">Sipariş Notu</h3>
              <p className="mt-2 text-sm text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status History */}
      {order.statusHistory.length > 0 && (
        <div className="mt-6 rounded-lg border bg-white p-6">
          <h3 className="mb-4 font-bold text-gray-900">Durum Geçmişi</h3>
          <div className="space-y-3">
            {order.statusHistory.map((h) => (
              <div key={h.id} className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-gray-400" />
                <div>
                  <p className="text-gray-700">
                    {h.fromStatus && (
                      <span className="text-gray-400">{STATUS_MAP[h.fromStatus]?.label || h.fromStatus} → </span>
                    )}
                    <span className="font-medium">{STATUS_MAP[h.toStatus]?.label || h.toStatus}</span>
                  </p>
                  {h.note && <p className="mt-0.5 text-gray-500">{h.note}</p>}
                  <p className="mt-0.5 text-xs text-gray-400">{new Date(h.createdAt).toLocaleString("tr-TR")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
