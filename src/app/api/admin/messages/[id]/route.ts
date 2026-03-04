"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET — single message + mark as read
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("orders", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  const message = await db.contactMessage.update({
    where: { id },
    data: { read: true },
  });

  if (!message) return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 });
  return NextResponse.json(message);
}

// PUT — reply to message
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("orders", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { replyText } = body;

  if (!replyText) {
    return NextResponse.json({ error: "Yanıt metni gerekli" }, { status: 400 });
  }

  const message = await db.contactMessage.findUnique({ where: { id } });
  if (!message) return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 });

  // Send reply email
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Vorte Tekstil <info@vorte.com.tr>",
      to: message.email,
      subject: `Re: ${message.subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <p>${replyText.replace(/\n/g, "<br>")}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">— Vorte Tekstil</p>
        </div>
      `,
    });

    // Log the email
    await db.emailLog.create({
      data: {
        to: message.email,
        subject: `Re: ${message.subject}`,
        status: "sent",
      },
    });
  } catch (err) {
    // Log failed email
    await db.emailLog.create({
      data: {
        to: message.email,
        subject: `Re: ${message.subject}`,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }

  // Update message as replied
  const updated = await db.contactMessage.update({
    where: { id },
    data: { replied: true, replyText, repliedAt: new Date() },
  });

  return NextResponse.json(updated);
}

// DELETE — delete message
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("orders", "d");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  await db.contactMessage.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
