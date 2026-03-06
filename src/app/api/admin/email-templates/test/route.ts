"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { resendClient } from "@/lib/integrations/resend";

// POST — send test email with sample data
export async function POST(req: NextRequest) {
  const admin = await requirePermission("settings", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const { templateName, to } = body;

  if (!templateName || !to) {
    return NextResponse.json({ error: "templateName ve to gerekli" }, { status: 400 });
  }

  try {
    const result = await resendClient.sendTestEmail(templateName, to);
    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gönderim hatası" },
      { status: 500 }
    );
  }
}
