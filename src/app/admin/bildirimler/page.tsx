"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CheckCheck, ExternalLink, Loader2 } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  orderId: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  NEW_ORDER: { label: "Sipariş", color: "bg-blue-500" },
  DEALER_ORDER: { label: "Bayi Sipariş", color: "bg-purple-500" },
  PAYMENT_SUCCESS: { label: "Ödeme", color: "bg-green-500" },
  PAYMENT_FAILED: { label: "Ödeme Hatası", color: "bg-red-500" },
  STOCK_ALERT: { label: "Stok Uyarısı", color: "bg-orange-500" },
  NEW_DEALER: { label: "Yeni Bayi", color: "bg-teal-500" },
};

function getNotificationLink(n: Notification): string | null {
  switch (n.type) {
    case "NEW_ORDER":
    case "DEALER_ORDER":
    case "PAYMENT_SUCCESS":
    case "PAYMENT_FAILED":
      return n.orderId ? `/admin/siparisler/${n.orderId}` : "/admin/siparisler";
    case "NEW_DEALER":
      return "/admin/bayiler";
    case "STOCK_ALERT":
      return "/admin/urunler";
    default:
      return null;
  }
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleClick = async (n: Notification) => {
    // Mark as read optimistically
    if (!n.isRead) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
      );
      fetch(`/api/admin/notifications/${n.id}/read`, { method: "POST" }).catch(() => {
        // Revert on error
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: false } : item))
        );
      });
    }

    // Navigate to related page
    const link = getNotificationLink(n);
    if (link) {
      router.push(link);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    try {
      await fetch("/api/admin/notifications/read-all", { method: "POST" });
    } catch {
      // Revert
      await fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bildirimler</h1>
          <p className="mt-1 text-sm text-gray-500">
            {unreadCount} okunmamış bildirim
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} loading={markingAll}>
            <CheckCheck className="mr-1 h-4 w-4" />
            Tümünü Okundu İşaretle
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {notifications.map((n) => {
          const typeInfo = TYPE_MAP[n.type] || { label: n.type, color: "bg-gray-400" };
          const link = getNotificationLink(n);
          return (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`flex items-start gap-4 rounded-lg border bg-white p-4 transition-colors ${
                !n.isRead ? "border-l-4 border-l-[#7AC143]" : ""
              } ${link ? "cursor-pointer hover:bg-gray-50" : ""}`}
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
              {link && (
                <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
              )}
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
