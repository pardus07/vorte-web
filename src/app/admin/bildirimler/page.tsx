"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  CreditCard,
  Package,
  ShieldAlert,
  ShoppingCart,
  Store,
  UserPlus,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  orderId: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_MAP: Record<
  string,
  { label: string; icon: typeof Package; bgColor: string; iconColor: string }
> = {
  NEW_ORDER: {
    label: "Siparis",
    icon: ShoppingCart,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  DEALER_ORDER: {
    label: "Bayi Siparis",
    icon: Store,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  PAYMENT_SUCCESS: {
    label: "Odeme",
    icon: CreditCard,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  PAYMENT_FAILED: {
    label: "Odeme Hatasi",
    icon: ShieldAlert,
    bgColor: "bg-red-50",
    iconColor: "text-red-600",
  },
  STOCK_ALERT: {
    label: "Stok Uyarisi",
    icon: Package,
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  NEW_DEALER: {
    label: "Yeni Bayi",
    icon: UserPlus,
    bgColor: "bg-teal-50",
    iconColor: "text-teal-600",
  },
};

const DEFAULT_TYPE = {
  label: "Bildirim",
  icon: Bell,
  bgColor: "bg-gray-50",
  iconColor: "text-gray-600",
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

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Az once";
  if (diffMin < 60) return `${diffMin} dk once`;
  if (diffHour < 24) return `${diffHour} saat once`;
  if (diffDay < 7) return `${diffDay} gun once`;
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

  /* ---- Loading State ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  /* ---- Main Render ---- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Bildirimler
          </h1>
          <p className="mt-1 text-[13px] text-gray-500">
            {unreadCount > 0
              ? `${unreadCount} okunmamis bildirim bulunuyor`
              : "Tum bildirimler okundu"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            loading={markingAll}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Tumunu Okundu Isaretle
          </Button>
        )}
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
            <BellOff className="h-7 w-7 text-gray-300" />
          </div>
          <p className="mt-4 text-sm font-medium text-gray-400">
            Henuz bildirim yok
          </p>
          <p className="mt-1 text-[13px] text-gray-300">
            Yeni bildirimler burada gorunecek
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const typeInfo = TYPE_MAP[n.type] || DEFAULT_TYPE;
            const Icon = typeInfo.icon;
            const link = getNotificationLink(n);

            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`group relative flex items-start gap-4 rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                  !n.isRead
                    ? "border-l-4 border-l-[#7AC143] border-t-gray-100 border-r-gray-100 border-b-gray-100 bg-[#7AC143]/5"
                    : "border-gray-100"
                } ${link ? "cursor-pointer" : ""}`}
              >
                {/* Type Icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${typeInfo.bgColor}`}
                >
                  <Icon className={`h-5 w-5 ${typeInfo.iconColor}`} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm leading-tight ${
                        !n.isRead
                          ? "font-semibold text-gray-900"
                          : "font-medium text-gray-700"
                      }`}
                    >
                      {n.title}
                    </p>
                    <Badge variant="subtle" className="text-[10px] shrink-0">
                      {typeInfo.label}
                    </Badge>
                    {!n.isRead && (
                      <span className="flex items-center gap-1 shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#7AC143]" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7AC143]">
                          Yeni
                        </span>
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-gray-500 line-clamp-2">
                    {n.message}
                  </p>
                  <p className="mt-2 text-[12px] text-gray-400">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </div>

                {/* Arrow indicator for clickable items */}
                {link && (
                  <div className="flex h-10 w-8 shrink-0 items-center justify-center">
                    <ChevronRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
