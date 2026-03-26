/**
 * Mail Tracking — Link Tıklama
 * GET /api/track/click?id=trackingId&url=hedefUrl
 *
 * OutreachEmail clickedAt/clickCount günceller, hedef URL'ye 302 redirect.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const trackingId = req.nextUrl.searchParams.get("id");
  const targetUrl = req.nextUrl.searchParams.get("url");

  // Hedef URL yoksa ana sayfaya yönlendir
  const redirectUrl = targetUrl || "https://www.vorte.com.tr";

  if (trackingId) {
    try {
      await db.outreachEmail.update({
        where: { trackingId },
        data: {
          clickedAt: new Date(),
          clickCount: { increment: 1 },
        },
      });

      // Prospect durumunu güncelle (CONTACTED veya OPENED ise CLICKED yap)
      const email = await db.outreachEmail.findUnique({
        where: { trackingId },
        select: { prospectId: true },
      });

      if (email) {
        await db.prospectCustomer.updateMany({
          where: {
            id: email.prospectId,
            status: { in: ["CONTACTED", "OPENED"] },
          },
          data: { status: "CLICKED" },
        });
      }
    } catch {
      // Tracking hatası redirect'i engellememeli
    }
  }

  return NextResponse.redirect(redirectUrl, 302);
}
