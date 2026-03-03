import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const role = (session.user as unknown as { role: string }).role;
  return role === "ADMIN";
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const banners = await db.banner.findMany({
    orderBy: [{ position: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json({ banners });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await request.json();
  const {
    name, position, imageDesktop, imageMobile,
    link, altText, active, sortOrder, startDate, endDate,
  } = body;

  if (!name || !position || !imageDesktop) {
    return NextResponse.json({ error: "Ad, pozisyon ve desktop görseli zorunlu" }, { status: 400 });
  }

  const banner = await db.banner.create({
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

  return NextResponse.json(banner, { status: 201 });
}
