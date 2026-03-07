import { db } from "@/lib/db";

/**
 * Log an admin activity. Fire-and-forget — never awaited, never throws.
 */
export function logActivity(
  userId: string,
  action: string,
  target?: string,
  details?: string,
  ip?: string
) {
  db.activityLog
    .create({
      data: {
        userId,
        action,
        target: target || null,
        details: details || null,
        ip: ip || null,
      },
    })
    .catch((err) => {
      console.error("[AuditLog] Failed to log activity:", err);
    });
}
