import { db } from "@/lib/db";
import {
  ShoppingCart,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Building2,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    todayOrders,
    pendingOrders,
    totalProducts,
    lowStockVariants,
    totalDealers,
    recentNotifications,
    todayRevenue,
  ] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: today } } }),
    db.order.count({ where: { status: "PENDING" } }),
    db.product.count({ where: { active: true } }),
    db.variant.count({ where: { stock: { lte: 5 }, active: true } }),
    db.dealer.count({ where: { status: "ACTIVE" } }),
    db.notification.findMany({
      where: { isRead: false },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.order.aggregate({
      where: { createdAt: { gte: today }, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
      _sum: { totalAmount: true },
    }),
  ]);

  const stats = [
    {
      label: "Bugünkü Satış",
      value: formatPrice(todayRevenue._sum.totalAmount || 0),
      icon: DollarSign,
      color: "bg-green-100 text-green-600",
    },
    {
      label: "Bugünkü Sipariş",
      value: todayOrders,
      icon: ShoppingCart,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Bekleyen Sipariş",
      value: pendingOrders,
      icon: TrendingUp,
      color: "bg-orange-100 text-orange-600",
    },
    {
      label: "Aktif Ürün",
      value: totalProducts,
      icon: Package,
      color: "bg-purple-100 text-purple-600",
    },
    {
      label: "Stok Uyarısı",
      value: lowStockVariants,
      icon: AlertTriangle,
      color: lowStockVariants > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600",
    },
    {
      label: "Aktif Bayi",
      value: totalDealers,
      icon: Building2,
      color: "bg-teal-100 text-teal-600",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">
        Mağaza durumuna genel bakış
      </p>

      {/* Stats grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent notifications */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900">Son Bildirimler</h2>
        {recentNotifications.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">Yeni bildirim yok</p>
        ) : (
          <div className="mt-4 space-y-3">
            {recentNotifications.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-lg border bg-white p-4"
              >
                <div
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    n.type === "NEW_ORDER"
                      ? "bg-blue-500"
                      : n.type === "STOCK_ALERT"
                        ? "bg-red-500"
                        : n.type === "DEALER_ORDER"
                          ? "bg-purple-500"
                          : "bg-gray-400"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="text-sm text-gray-500">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
