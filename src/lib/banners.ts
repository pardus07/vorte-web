import { db } from "@/lib/db";
import type { BannerData } from "@/components/home/PromoBanner";

/**
 * Belirli pozisyondaki aktif banner'ları getir (server-side)
 */
export async function getBannersByPosition(
  position: string
): Promise<BannerData[]> {
  try {
    const now = new Date();
    const banners = await db.banner.findMany({
      where: {
        position,
        active: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
      },
      orderBy: { sortOrder: "asc" },
    });

    return banners
      .filter((b) => !b.endDate || new Date(b.endDate) >= now)
      .map((b) => ({
        id: b.id,
        name: b.name,
        position: b.position,
        imageDesktop: b.imageDesktop,
        imageMobile: b.imageMobile,
        link: b.link,
        altText: b.altText,
      }));
  } catch {
    return [];
  }
}
