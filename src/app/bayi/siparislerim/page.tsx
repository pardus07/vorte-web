import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "success" | "warning" | "outline" | "discount" | "new" }> = {
  PENDING: { label: "Bekliyor", variant: "warning" },
  PAID: { label: "Ödendi", variant: "success" },
  PROCESSING: { label: "Hazırlanıyor", variant: "new" },
  SHIPPED: { label: "Kargoda", variant: "default" },
  DELIVERED: { label: "Teslim Edildi", variant: "success" },
  CANCELLED: { label: "İptal", variant: "discount" },
  REFUNDED: { label: "İade", variant: "outline" },
};

export default async function DealerOrdersPage() {
  const dealer = await getDealerSession();
  if (!dealer) return null;

  const orders = await db.order.findMany({
    where: { dealerId: dealer.id },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Siparişlerim</h1>
      <p className="mt-1 text-sm text-gray-500">{orders.length} sipariş</p>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Sipariş No</th>
              <th className="px-4 py-3 font-medium text-gray-700">Ürün</th>
              <th className="px-4 py-3 font-medium text-gray-700">Tutar</th>
              <th className="px-4 py-3 font-medium text-gray-700">Kargo</th>
              <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
              <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => {
              const statusInfo = STATUS_MAP[order.status] || { label: order.status, variant: "outline" as const };
              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">#{order.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-500">{order._count.items} kalem</td>
                  <td className="px-4 py-3 font-medium">{formatPrice(order.totalAmount)}</td>
                  <td className="px-4 py-3">
                    {order.cargoTrackingNo ? (
                      <div>
                        <p className="text-xs text-gray-500">{order.cargoProvider}</p>
                        <p className="font-mono text-xs text-[#7AC143]">{order.cargoTrackingNo}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Henüz sipariş yok
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
