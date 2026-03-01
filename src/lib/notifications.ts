import { db } from "@/lib/db";
import type { NotificationType } from "@prisma/client";

export async function createNotification({
  type,
  title,
  message,
  orderId,
}: {
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
}) {
  return db.notification.create({
    data: { type, title, message, orderId },
  });
}

export async function getUnreadCount(): Promise<number> {
  return db.notification.count({ where: { isRead: false } });
}

export async function markAsRead(id: string) {
  return db.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllAsRead() {
  return db.notification.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });
}
