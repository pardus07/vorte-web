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

  const sliders = await db.slider.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ sliders });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await request.json();
  const {
    title, subtitle, highlight, description,
    buttonText, buttonLink, secondaryButtonText, secondaryButtonLink,
    imageDesktop, imageMobile, altText,
    sortOrder, active, startDate, endDate,
  } = body;

  if (!imageDesktop || !imageMobile) {
    return NextResponse.json({ error: "Desktop ve mobil görseller zorunlu" }, { status: 400 });
  }

  const slider = await db.slider.create({
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

  return NextResponse.json(slider, { status: 201 });
}
