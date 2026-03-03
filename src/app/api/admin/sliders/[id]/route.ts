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
  const {
    title, subtitle, highlight, description,
    buttonText, buttonLink, secondaryButtonText, secondaryButtonLink,
    imageDesktop, imageMobile, altText,
    sortOrder, active, startDate, endDate,
  } = body;

  const slider = await db.slider.update({
    where: { id },
    data: {
      title: title || null,
      subtitle: subtitle || null,
      highlight: highlight || null,
      description: description || null,
      buttonText: buttonText || null,
      buttonLink: buttonLink || null,
      secondaryButtonText: secondaryButtonText || null,
      secondaryButtonLink: secondaryButtonLink || null,
      imageDesktop,
      imageMobile,
      altText: altText || null,
      sortOrder: sortOrder ?? 0,
      active: active ?? true,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
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
