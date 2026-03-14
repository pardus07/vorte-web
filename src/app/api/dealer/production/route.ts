import { NextResponse } from "next/server";
import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";

// GET — dealer's production orders with tracking
export async function GET() {
  const dealer = await getDealerSession();
  if (!dealer) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const orders = await db.fullProductionOrder.findMany({
    where: { dealerId: dealer.id },
    include: {
      items: true,
      tracking: { orderBy: { createdAt: "desc" }, take: 20 },
      qualityChecks: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  // Map to a safe response
  const result = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    stage: order.stage,
    priority: order.priority,
    stageHistory: order.stageHistory,
    estimatedDelivery: order.estimatedDelivery,
    actualDelivery: order.actualDelivery,
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      id: item.id,
      sku: item.sku,
      color: item.color,
      sizeBreakdown: item.sizeBreakdown,
      totalQuantity: item.totalQuantity,
    })),
    tracking: order.tracking.map((t) => ({
      stage: t.stage,
      progress: t.progress,
      notes: t.notes,
      createdAt: t.createdAt,
    })),
    qualityChecks: order.qualityChecks.map((qc) => ({
      result: qc.result,
      passRate: qc.passRate,
      notes: qc.notes,
      createdAt: qc.createdAt,
    })),
  }));

  return NextResponse.json({ orders: result });
}
