"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET — single session with all messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const session = await db.chatSession.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 404 });
  return NextResponse.json(session);
}

// PUT — update session (admin takeover, close, reply)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  // Admin reply
  if (body.reply) {
    await db.chatMessage.create({
      data: {
        sessionId: id,
        role: "admin",
        content: body.reply,
      },
    });
    await db.chatSession.update({
      where: { id },
      data: {
        messageCount: { increment: 1 },
        lastMessageAt: new Date(),
        status: "admin_takeover",
        aiEnabled: false,
      },
    });
    return NextResponse.json({ success: true });
  }

  // Status change
  if (body.status) {
    const updateData: Record<string, unknown> = { status: body.status };
    if (body.status === "admin_takeover") updateData.aiEnabled = false;
    if (body.status === "active") updateData.aiEnabled = true;

    await db.chatSession.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
}

// DELETE — delete session
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  await db.chatMessage.deleteMany({ where: { sessionId: id } });
  await db.chatSession.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
