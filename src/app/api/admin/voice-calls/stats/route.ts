import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

export async function GET() {
  const admin = await requirePermission("orders", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  try {
    const now = new Date();

    // Today start
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // This week start (Monday)
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // This month start
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todayCount,
      weekCount,
      monthCount,
      totalCount,
      avgDuration,
      allCallLogs,
    ] = await Promise.all([
      db.callLog.count({
        where: { startedAt: { gte: todayStart } },
      }),
      db.callLog.count({
        where: { startedAt: { gte: weekStart } },
      }),
      db.callLog.count({
        where: { startedAt: { gte: monthStart } },
      }),
      db.callLog.count(),
      db.callLog.aggregate({
        _avg: { durationSeconds: true },
      }),
      db.callLog.findMany({
        select: { topics: true },
      }),
    ]);

    // Calculate top topics
    const topicCounts: Record<string, number> = {};
    for (const log of allCallLogs) {
      for (const topic of log.topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }

    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    const averageDuration = Math.round(avgDuration._avg.durationSeconds || 0);

    return NextResponse.json({
      stats: {
        today: todayCount,
        thisWeek: weekCount,
        thisMonth: monthCount,
        total: totalCount,
        averageDurationSeconds: averageDuration,
        topTopics,
      },
    });
  } catch (error) {
    console.error("[voice-calls] stats error:", error);
    return NextResponse.json(
      { error: "İstatistikler alınamadı" },
      { status: 500 }
    );
  }
}
