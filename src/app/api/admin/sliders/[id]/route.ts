import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const role = (session.user as unknown as { role: string }).role;
  return role === "ADMIN";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;
  const slider = await db.slider.findUnique({ where: { id } });
  if (!slider) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
  return NextResponse.json(slider);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  // Partial update: sadece gönderilen alanları güncelle
  const data: Record<string, unknown> = {};
  if ("title" in body) data.title = body.title || null;
  if ("subtitle" in body) data.subtitle = body.subtitle || null;
  if ("highlight" in body) data.highlight = body.highlight || null;
  if ("description" in body) data.description = body.description || null;
  if ("buttonText" in body) data.buttonText = body.buttonText || null;
  if ("buttonLink" in body) data.buttonLink = body.buttonLink || null;
  if ("secondaryButtonText" in body) data.secondaryButtonText = body.secondaryButtonText || null;
  if ("secondaryButtonLink" in body) data.secondaryButtonLink = body.secondaryButtonLink || null;
  if ("imageDesktop" in body) data.imageDesktop = body.imageDesktop;
  if ("imageMobile" in body) data.imageMobile = body.imageMobile;
  if ("altText" in body) data.altText = body.altText || null;
  if ("sortOrder" in body) data.sortOrder = body.sortOrder ?? 0;
  if ("active" in body) data.active = body.active ?? true;
  if ("startDate" in body) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if ("endDate" in body) data.endDate = body.endDate ? new Date(body.endDate) : null;

  const slider = await db.slider.update({
    where: { id },
    data,
  });

  return NextResponse.json(slider);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;
  await db.slider.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
