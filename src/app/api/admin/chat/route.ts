"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET — list chat sessions
export async function GET(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;

  const sessions = await db.chatSession.findMany({
    where,
    include: {
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
  });

  const stats = {
    active: await db.chatSession.count({ where: { status: "active" } }),
    adminTakeover: await db.chatSession.count({ where: { status: "admin_takeover" } }),
    closed: await db.chatSession.count({ where: { status: "closed" } }),
    totalMessages: await db.chatMessage.count(),
  };

  return NextResponse.json({ sessions, stats });
}
