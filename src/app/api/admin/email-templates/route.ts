"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET — list all email templates
export async function GET() {
  const admin = await requirePermission("settings", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const templates = await db.emailTemplate.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
}

// POST — create or update template
export async function POST(req: NextRequest) {
  const admin = await requirePermission("settings", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const { name, subject, body: templateBody, variables, active } = body;

  if (!name || !subject || !templateBody) {
    return NextResponse.json({ error: "Ad, konu ve içerik gerekli" }, { status: 400 });
  }

  const result = await db.emailTemplate.upsert({
    where: { name },
    create: { name, subject, body: templateBody, variables, active: active ?? true },
    update: { subject, body: templateBody, variables, active: active ?? true },
  });

  return NextResponse.json(result);
}
