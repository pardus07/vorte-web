"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET — list email logs
export async function GET(req: NextRequest) {
  const admin = await requirePermission("settings", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { to: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
    ];
  }

  const [logs, total, statusCounts] = await Promise.all([
    db.emailLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.emailLog.count({ where }),
    db.emailLog.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  return NextResponse.json({
    logs,
    total,
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
  });
}
