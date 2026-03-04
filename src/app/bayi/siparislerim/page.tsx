import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { ClipboardList, Eye, RefreshCw, Package } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Bekliyor", color: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Ödendi", color: "bg-green-100 text-green-700" },
  PROCESSING: { label: "Hazırlanıyor", color: "bg-blue-100 text-blue-700" },
  SHIPPED: { label: "Kargoda", color: "bg-purple-100 text-purple-700" },
  DELIVERED: { label: "Teslim Edildi", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "İptal", color: "bg-red-100 text-red-700" },
  REFUNDED: { label: "İade", color: "bg-gray-100 text-gray-700" },
};

export default async function DealerOrdersPage() {
  const dealer = await getDealerSession();
  if (!dealer) return null;

  const orders = await db.order.findMany({
    where: { dealerId: dealer.id },
    include: {
      _count: { select: { items: true } },
      items: {
        take: 3,
        include: {
          product: { select: { name: true, images: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Siparişlerim</h1>
          <p className="mt-1 text-sm text-gray-500">{orders.length} sipariş</p>
        </div>
        <Link
          href="/bayi/urunler"
          className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6aad38]"
        >
          <Package className="h-4 w-4" />
          Yeni Sipariş
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="mt-12 flex flex-col items-center py-20">
          <ClipboardList className="h-16 w-16 text-gray-300" />
          <h2 className="mt-4 text-lg font-bold text-gray-900">Henüz Sipariş Yok</h2>
          <p className="mt-2 text-sm text-gray-500">Ürün kataloğundan ilk siparişinizi verin.</p>
          <Link
            href="/bayi/urunler"
            className="mt-4 rounded-lg bg-[#7AC143] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#6aad38]"
          >
            Ürünlere Git
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((order) => {
            const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "bg-gray-100 text-gray-600" };
            const thumbnails = order.items
              .map((item) => (item.product.images as string[])?.[0])
              .filter(Boolean);

            return (
              <Link
                key={order.id}
                href={`/bayi/siparislerim/${order.id}`}
                className="flex items-center gap-4 rounded-lg border bg-white p-4 transition hover:border-[#7AC143]/30 hover:shadow-sm"
              >
                {/* Thumbnails */}
                <div className="flex -space-x-2">
                  {thumbnails.length > 0 ? (
                    thumbnails.slice(0, 3).map((img, i) => (
                      <div
                        key={i}
                        className="h-12 w-12 rounded-lg border-2 border-white bg-gray-100 bg-cover bg-center"
                        style={{ backgroundImage: `url(${img})` }}
                      />
                    ))
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                      <Package className="h-5 w-5 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-gray-900">#{order.orderNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {order._count.items} kalem · {new Date(order.createdAt).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Cargo */}
                {order.cargoTrackingNo && (
                  <div className="hidden text-right sm:block">
                    <p className="text-[10px] text-gray-400">{order.cargoProvider}</p>
                    <p className="font-mono text-xs text-[#7AC143]">{order.cargoTrackingNo}</p>
                  </div>
                )}

                {/* Amount */}
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatPrice(order.totalAmount)}</p>
                </div>

                <Eye className="h-4 w-4 flex-shrink-0 text-gray-300" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
