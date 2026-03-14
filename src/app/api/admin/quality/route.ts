import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  productionOrderId: z.string().min(1),
  result: z.enum(["PASSED", "FAILED", "CONDITIONAL"]),
  inspectedQuantity: z.number().int().positive(),
  defectQuantity: z.number().int().min(0).default(0),
  defectDetails: z.array(
    z.object({ type: z.string(), count: z.number().int() })
  ).optional(),
  photos: z.array(z.string()).optional(),
  inspectorNotes: z.string().optional(),
});

// GET — list quality checks
export async function GET(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const productionOrderId = searchParams.get("productionOrderId");
  const result = searchParams.get("result");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (productionOrderId) where.productionOrderId = productionOrderId;
  if (result && result !== "all") where.result = result;

  const checks = await db.qualityCheck.findMany({
    where,
    include: {
      productionOrder: { select: { orderNumber: true, stage: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ checks });
}

// POST — create quality check + auto update stage
export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
  }

  const { productionOrderId, result, inspectedQuantity, defectQuantity, defectDetails, photos, inspectorNotes } = parsed.data;

  // Verify production order exists
  const prodOrder = await db.fullProductionOrder.findUnique({ where: { id: productionOrderId } });
  if (!prodOrder) {
    return NextResponse.json({ error: "Üretim siparişi bulunamadı" }, { status: 404 });
  }

  // Calculate defect rate
  const defectRate = inspectedQuantity > 0 ? (defectQuantity / inspectedQuantity) * 100 : 0;

  const check = await db.qualityCheck.create({
    data: {
      productionOrderId,
      result,
      inspectedQuantity,
      defectQuantity,
      defectRate: Math.round(defectRate * 100) / 100,
      ...(defectDetails ? { defectDetails: JSON.parse(JSON.stringify(defectDetails)) } : {}),
      photos: photos || [],
      inspectorNotes,
    },
  });

  // Auto update stage if quality check passed and order is in QUALITY_CHECK stage
  if (result === "PASSED" && prodOrder.stage === "QUALITY_CHECK") {
    const history = prodOrder.stageHistory as Array<Record<string, unknown>>;
    history.push({
      stage: "PACKAGING_STAGE",
      date: new Date().toISOString(),
      note: `Kalite kontrol geçti — ${inspectedQuantity} adet kontrol, %${defectRate.toFixed(1)} hata`,
      changedBy: admin.name || admin.email,
    });

    await db.fullProductionOrder.update({
      where: { id: productionOrderId },
      data: { stage: "PACKAGING_STAGE", stageHistory: JSON.parse(JSON.stringify(history)) },
    });

    await db.productionTracking.create({
      data: {
        productionOrderId,
        stage: "PACKAGING_STAGE",
        progress: 85,
        notes: `KK geçti — ${inspectedQuantity} kontrol, ${defectQuantity} hatalı (%${defectRate.toFixed(1)})`,
      },
    });
  }

  return NextResponse.json(check, { status: 201 });
}
