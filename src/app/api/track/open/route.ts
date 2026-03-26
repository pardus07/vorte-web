/**
 * Mail Tracking — Açılma Piksel
 * GET /api/track/open?id=trackingId
 *
 * 1x1 transparent GIF döner, OutreachEmail openedAt/openCount günceller.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// 1x1 transparent GIF (43 bytes)
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const trackingId = req.nextUrl.searchParams.get("id");

  if (trackingId) {
    try {
      await db.outreachEmail.update({
        where: { trackingId },
        data: {
          openedAt: new Date(),
          openCount: { increment: 1 },
        },
      });

      // Prospect durumunu da güncelle (sadece CONTACTED ise OPENED yap)
      const email = await db.outreachEmail.findUnique({
        where: { trackingId },
        select: { prospectId: true },
      });

      if (email) {
        await db.prospectCustomer.updateMany({
          where: { id: email.prospectId, status: "CONTACTED" },
          data: { status: "OPENED" },
        });
      }
    } catch {
      // Tracking hatası mail teslimini engellememeli
    }
  }

  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(TRANSPARENT_GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
