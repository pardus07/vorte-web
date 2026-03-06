"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { resendClient } from "@/lib/integrations/resend";

// POST — preview template with sample data
export async function POST(req: NextRequest) {
  const admin = await requirePermission("settings", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const { templateName } = body;

  if (!templateName) {
    return NextResponse.json({ error: "templateName gerekli" }, { status: 400 });
  }

  try {
    const result = await resendClient.previewTemplate(templateName);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Önizleme hatası" },
      { status: 500 }
    );
  }
}
