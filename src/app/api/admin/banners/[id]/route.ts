import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const role = (session.user as unknown as { role: string }).role;
  return role === "ADMIN";
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
    name, position, imageDesktop, imageMobile,
    link, altText, active, sortOrder, startDate, endDate,
  } = body;

  const banner = await db.banner.update({
    where: { id },
    data: {
      name,
      position,
      imageDesktop,
      imageMobile: imageMobile || null,
      link: link || null,
      altText: altText || null,
      active: active ?? true,
      sortOrder: sortOrder ?? 0,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  return NextResponse.json(banner);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;
  await db.banner.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
