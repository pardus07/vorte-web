export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { formatPrice } from "@/lib/utils";
import { ShoppingBag, Package, ChevronRight } from "lucide-react";
import Link from "next/link";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Bekliyor", color: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Ödendi", color: "bg-green-100 text-green-700" },
  PROCESSING: { label: "Hazırlanıyor", color: "bg-blue-100 text-blue-700" },
  SHIPPED: { label: "Kargoda", color: "bg-purple-100 text-purple-700" },
  DELIVERED: { label: "Teslim Edildi", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "İptal", color: "bg-red-100 text-red-700" },
  REFUNDED: { label: "İade", color: "bg-gray-100 text-gray-700" },
};

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const orders = await db.order.findMany({
    where: { userId: session.user.id },
    include: {
      items: {
        take: 3,
        include: {
          product: { select: { name: true, images: true } },
        },
      },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: "Hesabım", href: "/hesabim" },
          { label: "Siparişlerim" },
        ]}
      />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Siparişlerim</h1>
      <p className="mt-1 text-sm text-gray-500">{orders.length} sipariş</p>

      {orders.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <ShoppingBag className="h-16 w-16 text-gray-300" />
          <h2 className="mt-4 text-lg font-bold text-gray-900">Henüz Siparişiniz Yok</h2>
          <p className="mt-2 text-sm text-gray-500">İlk siparişinizi verin!</p>
          <Link
            href="/"
            className="mt-4 rounded-lg bg-[#7AC143] px-6 py-2 text-sm font-medium text-white hover:bg-[#6aad38]"
          >
            Alışverişe Başla
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => {
            const st = STATUS_MAP[order.status] || { label: order.status, color: "bg-gray-100 text-gray-600" };
            return (
              <Link
                key={order.id}
                href={`/hesabim/siparislerim/${order.id}`}
                className="block rounded-lg border bg-white transition hover:border-[#7AC143]/30 hover:shadow-sm"
              >
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium text-gray-900">#{order.orderNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    {order.items.slice(0, 3).map((item) => {
                      const img = (item.product.images as string[])?.[0];
                      return img ? (
                        <div
                          key={item.id}
                          className="h-10 w-10 rounded bg-gray-100 bg-cover bg-center"
                          style={{ backgroundImage: `url(${img})` }}
                          title={item.product.name}
                        />
                      ) : (
                        <div key={item.id} className="flex h-10 w-10 items-center justify-center rounded bg-gray-100">
                          <Package className="h-4 w-4 text-gray-300" />
                        </div>
                      );
                    })}
                    <span className="text-xs text-gray-400">{order._count.items} ürün</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{formatPrice(order.totalAmount)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
