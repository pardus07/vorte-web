import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { geliverClient } from "@/lib/integrations/geliver";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const query = sp.get("q") || "";

  if (!query || query.length < 3) {
    return NextResponse.json({ error: "Lütfen geçerli bir sipariş veya takip numarası girin" }, { status: 400 });
  }

  // Search by order number or tracking number
  const order = await db.order.findFirst({
    where: {
      OR: [
        { orderNumber: { equals: query.replace("#", ""), mode: "insensitive" } },
        { cargoTrackingNo: { equals: query, mode: "insensitive" } },
      ],
    },
    select: {
      orderNumber: true,
      status: true,
      cargoTrackingNo: true,
      cargoProvider: true,
      createdAt: true,
      updatedAt: true,
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: {
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }

  // If tracking number exists, try to get Geliver tracking events
  let trackingEvents: { status: string; description: string; location: string; timestamp: string }[] = [];
  if (order.cargoTrackingNo) {
    try {
      trackingEvents = await geliverClient.getTracking(order.cargoTrackingNo);
    } catch {
      // Geliver tracking may fail, continue without it
    }
  }

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.status,
    cargoTrackingNo: order.cargoTrackingNo,
    cargoProvider: order.cargoProvider,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    statusHistory: order.statusHistory,
    trackingEvents,
  });
}
