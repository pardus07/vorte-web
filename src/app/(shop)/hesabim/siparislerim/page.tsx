export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "success" | "warning" | "outline" | "discount" | "new" }> = {
  PENDING: { label: "Bekliyor", variant: "warning" },
  PAID: { label: "Ödendi", variant: "success" },
  PROCESSING: { label: "Hazırlanıyor", variant: "new" },
  SHIPPED: { label: "Kargoda", variant: "default" },
  DELIVERED: { label: "Teslim Edildi", variant: "success" },
  CANCELLED: { label: "İptal", variant: "discount" },
  REFUNDED: { label: "İade", variant: "outline" },
};

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const orders = await db.order.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Hesabım", href: "/hesabim" }, { label: "Siparişlerim" }]} />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Siparişlerim</h1>

      {orders.length === 0 ? (
        <div className="mt-8 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-gray-500">Henüz siparişiniz yok.</p>
          <Link href="/erkek-ic-giyim" className="mt-3 inline-block text-sm text-[#7AC143] hover:underline">Alışverişe Başla</Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Sipariş No</th>
                <th className="px-4 py-3 font-medium text-gray-700">Ürün</th>
                <th className="px-4 py-3 font-medium text-gray-700">Tutar</th>
                <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => {
                const statusInfo = STATUS_MAP[order.status] || { label: order.status, variant: "outline" as const };
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">#{order.orderNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{order._count.items} ürün</td>
                    <td className="px-4 py-3 font-medium">{formatPrice(order.totalAmount)}</td>
                    <td className="px-4 py-3"><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></td>
                    <td className="px-4 py-3 text-gray-500">{new Date(order.createdAt).toLocaleDateString("tr-TR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
