import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";
import { ShoppingCart, Package, FileText, TrendingUp } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default async function DealerDashboardPage() {
  const dealer = await getDealerSession();
  if (!dealer) return null;

  const [orderCount, recentOrders, totalSpent] = await Promise.all([
    db.order.count({ where: { dealerId: dealer.id } }),
    db.order.findMany({
      where: { dealerId: dealer.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { items: true } } },
    }),
    db.order.aggregate({
      where: {
        dealerId: dealer.id,
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Hoş Geldiniz, {dealer.companyName}
      </h1>
      <p className="mt-1 text-sm text-gray-500">Bayi panelinize genel bakış</p>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Toplam Sipariş",
            value: orderCount,
            icon: ShoppingCart,
            color: "bg-blue-100 text-blue-600",
          },
          {
            label: "Toplam Harcama",
            value: formatPrice(totalSpent._sum.totalAmount || 0),
            icon: TrendingUp,
            color: "bg-green-100 text-green-600",
          },
          {
            label: "Ürün Çeşidi",
            value: "-",
            icon: Package,
            color: "bg-purple-100 text-purple-600",
          },
          {
            label: "Fatura",
            value: "-",
            icon: FileText,
            color: "bg-orange-100 text-orange-600",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`rounded-lg p-3 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent orders */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900">Son Siparişler</h2>
        {recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">Henüz sipariş yok</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Sipariş No</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Tutar</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-medium">#{order.orderNumber}</td>
                    <td className="px-4 py-3">{formatPrice(order.totalAmount)}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{order.status.toLowerCase()}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
