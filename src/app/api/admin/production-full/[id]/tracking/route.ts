import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET — tracking history for a production order
export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  const [tracking, order] = await Promise.all([
    db.productionTracking.findMany({
      where: { productionOrderId: id },
      orderBy: { createdAt: "desc" },
    }),
    db.fullProductionOrder.findUnique({
      where: { id },
      select: { stageHistory: true, stage: true, orderNumber: true },
    }),
  ]);

  if (!order) {
    return NextResponse.json({ error: "Üretim siparişi bulunamadı" }, { status: 404 });
  }

  return NextResponse.json({
    tracking,
    stageHistory: order.stageHistory,
    currentStage: order.stage,
  });
}

// POST — add manual tracking entry (e.g., fason atölye günlük güncelleme)
export async function POST(req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const order = await db.fullProductionOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Üretim siparişi bulunamadı" }, { status: 404 });
  }

  const entry = await db.productionTracking.create({
    data: {
      productionOrderId: id,
      stage: body.stage || order.stage,
      progress: body.progress ?? 0,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
