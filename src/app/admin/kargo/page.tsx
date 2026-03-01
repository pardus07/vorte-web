import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export default async function AdminShippingPage() {
  const shippedOrders = await db.order.findMany({
    where: { status: { in: ["PROCESSING", "SHIPPED", "DELIVERED"] } },
    include: {
      user: { select: { name: true } },
      dealer: { select: { companyName: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Kargo Yönetimi</h1>
      <p className="mt-1 text-sm text-gray-500">Kargoya verilmiş ve bekleyen siparişler</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">
            {shippedOrders.filter((o) => o.status === "PROCESSING").length}
          </p>
          <p className="text-sm text-gray-500">Hazırlanıyor</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {shippedOrders.filter((o) => o.status === "SHIPPED").length}
          </p>
          <p className="text-sm text-gray-500">Kargoda</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {shippedOrders.filter((o) => o.status === "DELIVERED").length}
          </p>
          <p className="text-sm text-gray-500">Teslim Edildi</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Sipariş</th>
              <th className="px-4 py-3 font-medium text-gray-700">Müşteri</th>
              <th className="px-4 py-3 font-medium text-gray-700">Kargo Firması</th>
              <th className="px-4 py-3 font-medium text-gray-700">Takip No</th>
              <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shippedOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/siparisler/${order.id}`} className="font-medium text-[#7AC143] hover:underline">
                    #{order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {order.dealer?.companyName || order.user?.name || "Misafir"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {order.cargoProvider || "—"}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-gray-600">
                  {order.cargoTrackingNo || "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      order.status === "DELIVERED" ? "success" :
                      order.status === "SHIPPED" ? "default" : "warning"
                    }
                  >
                    {order.status === "PROCESSING" ? "Hazırlanıyor" :
                     order.status === "SHIPPED" ? "Kargoda" : "Teslim Edildi"}
                  </Badge>
                </td>
              </tr>
            ))}
            {shippedOrders.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Henüz kargo yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
