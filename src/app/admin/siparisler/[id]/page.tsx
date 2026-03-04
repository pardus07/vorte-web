import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { OrderActions } from "./OrderActions";

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
      user: { select: { id: true, name: true, email: true, phone: true } },
      dealer: { select: { id: true, companyName: true, dealerCode: true, contactName: true, phone: true, email: true } },
      items: {
        include: {
          product: { select: { name: true, slug: true, images: true } },
          variant: { select: { color: true, size: true, sku: true, stock: true } },
        },
      },
      payment: true,
      invoice: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) notFound();

  const statusInfo = STATUS_MAP[order.status] || { label: order.status, variant: "outline" as const };
  const address = order.addressSnapshot as { fullName?: string; phone?: string; city?: string; district?: string; address?: string; zipCode?: string };

  // Calculate subtotal
  const subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/siparisler" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Sipariş #{order.orderNumber}
          </h1>
          <p className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleString("tr-TR")} ·{" "}
            <Badge variant={order.type === "WHOLESALE" ? "new" : "outline"}>
              {order.type === "WHOLESALE" ? "Toptan" : "Perakende"}
            </Badge>
          </p>
        </div>
        <Badge variant={statusInfo.variant} className="text-sm px-3 py-1">
          {statusInfo.label}
        </Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Ürünler ({order.items.length})</h2>
            <div className="divide-y">
              {order.items.map((item) => {
                const productImage = item.product.images?.[0];
                return (
                  <div key={item.id} className="flex items-center gap-4 py-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {productImage ? (
                        <Image
                          src={productImage}
                          alt={item.product.name}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-300 text-xs">Yok</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/urun/${item.product.slug}`}
                        className="font-medium text-gray-900 hover:text-[#7AC143]"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {item.variant.color} / {item.variant.size} — SKU: {item.variant.sku}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Stok: {item.variant.stock}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-gray-500">{item.quantity} × {formatPrice(item.unitPrice)}</p>
                      <p className="font-medium text-gray-900">{formatPrice(item.totalPrice)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price Summary */}
            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Ara Toplam</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {order.shippingCost > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Kargo</span>
                  <span>{formatPrice(order.shippingCost)}</span>
                </div>
              )}
              {order.shippingCost === 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Kargo</span>
                  <span>Ücretsiz</span>
                </div>
              )}
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>İndirim {order.couponCode && `(${order.couponCode})`}</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-base font-bold text-gray-900">
                <span>Toplam</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Order Actions — Client Component */}
          <OrderActions
            orderId={order.id}
            currentStatus={order.status}
            cargoTrackingNo={order.cargoTrackingNo || ""}
            cargoProvider={order.cargoProvider || ""}
            adminNotes={order.adminNotes || ""}
            hasInvoice={!!order.invoice}
            hasShipment={!!order.cargoTrackingNo}
            paymentStatus={order.payment?.status || "PENDING"}
            orderItems={order.items.map((item) => ({
              id: item.id,
              name: item.product.name,
              color: item.variant.color,
              size: item.variant.size,
              quantity: item.quantity,
              totalPrice: item.totalPrice,
            }))}
          />

          {/* Timeline */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Sipariş Zaman Çizelgesi</h2>
            <div className="relative space-y-4">
              {/* Creation entry */}
              <div className="flex gap-3">
                <div className="relative flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-[#7AC143]" />
                  {order.statusHistory.length > 0 && (
                    <div className="w-0.5 flex-1 bg-gray-200" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium text-gray-900">Sipariş oluşturuldu</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
              </div>

              {/* Status history entries (reversed to show oldest first) */}
              {[...order.statusHistory].reverse().map((entry, idx) => {
                const toStatusInfo = STATUS_MAP[entry.toStatus] || { label: entry.toStatus, variant: "outline" as const };
                const isLast = idx === order.statusHistory.length - 1;
                return (
                  <div key={entry.id} className="flex gap-3">
                    <div className="relative flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full ${isLast ? "bg-[#7AC143]" : "bg-gray-300"}`} />
                      {!isLast && <div className="w-0.5 flex-1 bg-gray-200" />}
                    </div>
                    <div className="pb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={toStatusInfo.variant} className="text-[10px]">
                          {toStatusInfo.label}
                        </Badge>
                        {entry.fromStatus && (
                          <span className="text-[10px] text-gray-400">
                            {STATUS_MAP[entry.fromStatus]?.label || entry.fromStatus} →
                          </span>
                        )}
                      </div>
                      {entry.note && (
                        <p className="mt-1 text-xs text-gray-600">{entry.note}</p>
                      )}
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {new Date(entry.createdAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  </div>
                );
              })}

              {order.statusHistory.length === 0 && (
                <p className="text-xs text-gray-400 pl-6">Henüz durum değişikliği yok</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
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
                <p>{order.dealer.email}</p>
                <Link href={`/admin/bayiler/${order.dealer.id}`} className="mt-2 inline-block text-xs text-[#7AC143] hover:underline">
                  Bayi Detayına Git →
                </Link>
              </div>
            ) : (
              <div className="space-y-1 text-sm text-gray-600">
                <p className="font-medium text-gray-900">{order.user?.name || "Misafir"}</p>
                <p>{order.user?.email}</p>
                {order.user?.phone && <p>{order.user.phone}</p>}
              </div>
            )}
          </div>

          {/* Delivery Address */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-3 font-bold text-gray-900">Teslimat Adresi</h3>
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900">{address.fullName}</p>
              <p>{address.phone}</p>
              <p className="mt-1">{address.address}</p>
              <p>{address.district} / {address.city}</p>
              {address.zipCode && <p>{address.zipCode}</p>}
            </div>
          </div>

          {/* Payment */}
          {order.payment && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-3 font-bold text-gray-900">Ödeme Bilgileri</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Durum</span>
                  <Badge
                    variant={
                      order.payment.status === "SUCCESS" ? "success" :
                      order.payment.status === "FAILED" ? "discount" :
                      order.payment.status === "REFUNDED" ? "outline" : "warning"
                    }
                    className="text-[10px]"
                  >
                    {order.payment.status === "SUCCESS" ? "Ödendi" :
                     order.payment.status === "FAILED" ? "Başarısız" :
                     order.payment.status === "REFUNDED" ? "İade Edildi" : "Bekliyor"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Tutar</span>
                  <span className="font-medium">{formatPrice(order.payment.amount)}</span>
                </div>
                {order.payment.paidAt && (
                  <div className="flex justify-between">
                    <span>Ödeme Tarihi</span>
                    <span>{new Date(order.payment.paidAt).toLocaleString("tr-TR")}</span>
                  </div>
                )}
                {order.payment.iyzicoPaymentId && (
                  <div className="flex justify-between">
                    <span>iyzico Ref.</span>
                    <span className="font-mono text-xs">{order.payment.iyzicoPaymentId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shipping */}
          {order.cargoTrackingNo && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-3 font-bold text-gray-900">Kargo Bilgileri</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Firma</span>
                  <span className="font-medium">{order.cargoProvider}</span>
                </div>
                <div className="flex justify-between">
                  <span>Takip No</span>
                  <span className="font-mono text-xs">{order.cargoTrackingNo}</span>
                </div>
              </div>
            </div>
          )}

          {/* Invoice */}
          {order.invoice && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-3 font-bold text-gray-900">Fatura</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Fatura No</span>
                  <span className="font-mono text-xs">{order.invoice.invoiceNo || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tip</span>
                  <Badge variant="outline" className="text-[10px]">
                    {order.invoice.invoiceType === "EFATURA" ? "E-Fatura" : "E-Arşiv"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Durum</span>
                  <Badge
                    variant={order.invoice.status === "CREATED" || order.invoice.status === "SENT" ? "success" : "warning"}
                    className="text-[10px]"
                  >
                    {order.invoice.status === "CREATED" ? "Oluşturuldu" :
                     order.invoice.status === "SENT" ? "Gönderildi" :
                     order.invoice.status === "ERROR" ? "Hata" : "Bekliyor"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Customer Notes */}
          {order.notes && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-3 font-bold text-gray-900">Müşteri Notu</h3>
              <p className="text-sm text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
