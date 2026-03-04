"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET — list contact messages (inbox)
export async function GET(req: NextRequest) {
  const admin = await requirePermission("orders", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const filter = searchParams.get("filter") || ""; // "unread", "unreplied"
  const search = searchParams.get("search") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (filter === "unread") where.read = false;
  if (filter === "unreplied") where.replied = false;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
      { message: { contains: search, mode: "insensitive" } },
    ];
  }

  const [messages, total, unreadCount] = await Promise.all([
    db.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.contactMessage.count({ where }),
    db.contactMessage.count({ where: { read: false } }),
  ]);

  return NextResponse.json({ messages, total, unreadCount });
}
