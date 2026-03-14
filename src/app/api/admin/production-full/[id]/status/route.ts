import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const VALID_STAGES = [
  "PENDING", "BOM_CALCULATED", "MATERIALS_ORDERED", "MATERIALS_RECEIVED",
  "IN_PRODUCTION", "QUALITY_CHECK", "PACKAGING_STAGE", "PROD_SHIPPED",
  "PROD_DELIVERED", "PROD_CANCELLED",
] as const;

// Stage → progress % mapping
const STAGE_PROGRESS: Record<string, number> = {
  PENDING: 0,
  BOM_CALCULATED: 10,
  MATERIALS_ORDERED: 20,
  MATERIALS_RECEIVED: 35,
  IN_PRODUCTION: 50,
  QUALITY_CHECK: 75,
  PACKAGING_STAGE: 85,
  PROD_SHIPPED: 95,
  PROD_DELIVERED: 100,
  PROD_CANCELLED: 0,
};

const statusSchema = z.object({
  stage: z.enum(VALID_STAGES),
  note: z.string().optional(),
  progress: z.number().int().min(0).max(100).optional(),
});

// PATCH — update production order stage
// Writes to BOTH stageHistory (JSON array) AND ProductionTracking table
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
  }

  const { stage: newStage, note, progress } = parsed.data;

  const order = await db.fullProductionOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Üretim siparişi bulunamadı" }, { status: 404 });
  }

  if (order.stage === newStage) {
    return NextResponse.json({ error: "Sipariş zaten bu aşamada" }, { status: 400 });
  }

  const changedBy = admin.name || admin.email;
  const now = new Date();

  // 1. Update stageHistory JSON array — push new entry
  const history = order.stageHistory as Array<Record<string, unknown>>;
  history.push({
    stage: newStage,
    date: now.toISOString(),
    note: note || `${order.stage} → ${newStage}`,
    changedBy,
  });

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    stage: newStage,
    stageHistory: JSON.parse(JSON.stringify(history)),
  };

  // Auto-set actualDelivery when delivered
  if (newStage === "PROD_DELIVERED") {
    updateData.actualDelivery = now;
  }

  // Update order
  const updated = await db.fullProductionOrder.update({
    where: { id },
    data: updateData,
    include: { items: true },
  });

  // 2. Create ProductionTracking entry
  await db.productionTracking.create({
    data: {
      productionOrderId: id,
      stage: newStage,
      progress: progress ?? STAGE_PROGRESS[newStage] ?? 0,
      notes: note || `Durum güncellendi: ${order.stage} → ${newStage}`,
    },
  });

  return NextResponse.json({
    order: updated,
    stageChange: {
      from: order.stage,
      to: newStage,
      changedBy,
      date: now.toISOString(),
    },
  });
}
