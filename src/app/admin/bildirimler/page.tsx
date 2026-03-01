import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { MarkAllReadButton } from "./MarkAllReadButton";

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  NEW_ORDER: { label: "Sipariş", color: "bg-blue-500" },
  DEALER_ORDER: { label: "Bayi Sipariş", color: "bg-purple-500" },
  PAYMENT_SUCCESS: { label: "Ödeme", color: "bg-green-500" },
  PAYMENT_FAILED: { label: "Ödeme Hatası", color: "bg-red-500" },
  STOCK_ALERT: { label: "Stok Uyarısı", color: "bg-orange-500" },
  NEW_DEALER: { label: "Yeni Bayi", color: "bg-teal-500" },
};

export default async function AdminNotificationsPage() {
  const notifications = await db.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bildirimler</h1>
          <p className="mt-1 text-sm text-gray-500">
            {unreadCount} okunmamış bildirim
          </p>
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      <div className="mt-6 space-y-3">
        {notifications.map((n) => {
          const typeInfo = TYPE_MAP[n.type] || { label: n.type, color: "bg-gray-400" };
          return (
            <div
              key={n.id}
              className={`flex items-start gap-4 rounded-lg border bg-white p-4 ${
                !n.isRead ? "border-l-4 border-l-[#7AC143]" : ""
              }`}
            >
              <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${typeInfo.color}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{n.title}</p>
                  <Badge variant="outline" className="text-[10px]">{typeInfo.label}</Badge>
                  {!n.isRead && <Badge variant="new" className="text-[10px]">Yeni</Badge>}
                </div>
                <p className="mt-1 text-sm text-gray-500">{n.message}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleString("tr-TR")}
                </p>
              </div>
            </div>
          );
        })}
        {notifications.length === 0 && (
          <div className="py-12 text-center text-gray-400">Henüz bildirim yok</div>
        )}
      </div>
    </div>
  );
}
