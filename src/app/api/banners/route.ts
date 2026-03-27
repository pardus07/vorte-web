import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Public endpoint: Belirli pozisyondaki aktif banner'ları döndürür
 * GET /api/banners?position=checkout
 */
export async function GET(req: NextRequest) {
  const position = req.nextUrl.searchParams.get("position");
  if (!position) {
    return NextResponse.json({ banners: [] });
  }

  try {
    const now = new Date();
    const banners = await db.banner.findMany({
      where: {
        position,
        active: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        position: true,
        imageDesktop: true,
        imageMobile: true,
        link: true,
        altText: true,
        endDate: true,
      },
    });

    const filtered = banners.filter(
      (b) => !b.endDate || new Date(b.endDate) >= now
    );

    return NextResponse.json({ banners: filtered });
  } catch {
    return NextResponse.json({ banners: [] });
  }
}
