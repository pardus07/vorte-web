import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";
import { Megaphone, Bell, Calendar } from "lucide-react";

export default async function DealerDuyurularPage() {
  const session = await getDealerSession();
  if (!session) return null;

  // Get notifications (all types visible to dealers)
  const notifications = await db.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Duyurular</h1>
      <p className="mt-1 text-sm text-gray-500">Vorte&apos;den gelen duyuru ve bilgilendirmeler</p>

      {notifications.length === 0 ? (
        <div className="mt-12 flex flex-col items-center py-20">
          <Megaphone className="h-16 w-16 text-gray-300" />
          <h2 className="mt-4 text-lg font-bold text-gray-900">Duyuru Yok</h2>
          <p className="mt-2 text-sm text-gray-500">Henüz bir duyuru yayınlanmadı.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border bg-white p-5 transition hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 rounded-lg p-2 ${
                  n.type === "DEALER_ORDER" || n.type === "NEW_DEALER"
                    ? "bg-purple-100 text-purple-600"
                    : "bg-blue-100 text-blue-600"
                }`}>
                  {n.type === "DEALER_ORDER" || n.type === "NEW_DEALER" ? (
                    <Megaphone className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-900">{n.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{n.message}</p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    {new Date(n.createdAt).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
