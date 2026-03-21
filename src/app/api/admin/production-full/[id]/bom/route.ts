import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { calculateBOM, calculateCostEstimate, type BOMInput } from "@/lib/production/bom-calculator";

type Params = { params: Promise<{ id: string }> };

// GET — get BOM for production order
export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  const bom = await db.bOMCalculation.findUnique({
    where: { productionOrderId: id },
  });

  if (!bom) {
    return NextResponse.json({ error: "BOM henüz hesaplanmamış" }, { status: 404 });
  }

  return NextResponse.json(bom);
}

// POST — calculate (or recalculate) BOM → upsert
export async function POST(_req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  // Get production order with items
  const order = await db.fullProductionOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Üretim siparişi bulunamadı" }, { status: 404 });
  }

  if (order.items.length === 0) {
    return NextResponse.json({ error: "Sipariş kalemleri boş, BOM hesaplanamaz" }, { status: 400 });
  }

  // Build BOM inputs from order items
  const bomInputs: BOMInput[] = order.items.map((item) => ({
    sku: item.sku,
    productName: item.productName,
    color: item.color,
    sizeS: item.sizeS,
    sizeM: item.sizeM,
    sizeL: item.sizeL,
    sizeXL: item.sizeXL,
    sizeXXL: item.sizeXXL,
  }));

  // Calculate BOM
  const bomResult = calculateBOM(bomInputs);

  // Calculate cost estimate
  const costEstimate = calculateCostEstimate(bomResult, bomInputs);
  const totalWeightKg = bomResult.summary.totalWeightKg;
  const estimatedCost = costEstimate.totalCost;

  // Upsert — aynı sipariş için tekrar çağrılırsa mevcut BOM'u güncelle
  const bom = await db.bOMCalculation.upsert({
    where: { productionOrderId: id },
    create: {
      productionOrderId: id,
      materials: JSON.parse(JSON.stringify(bomResult.materials)),
      totalFabricKg: bomResult.summary.totalFabricKg,
      totalLiningKg: bomResult.summary.totalLiningKg,
      totalElasticM: bomResult.summary.totalElasticM,
      totalThreadM: bomResult.summary.totalThreadM,
      totalLabels: bomResult.summary.totalLabels,
      totalPackaging: bomResult.summary.totalPackaging,
      totalWeightKg,
      estimatedCost,
    },
    update: {
      materials: JSON.parse(JSON.stringify(bomResult.materials)),
      totalFabricKg: bomResult.summary.totalFabricKg,
      totalLiningKg: bomResult.summary.totalLiningKg,
      totalElasticM: bomResult.summary.totalElasticM,
      totalThreadM: bomResult.summary.totalThreadM,
      totalLabels: bomResult.summary.totalLabels,
      totalPackaging: bomResult.summary.totalPackaging,
      totalWeightKg,
      estimatedCost,
      calculatedAt: new Date(),
    },
  });

  // Update stage if still PENDING
  if (order.stage === "PENDING") {
    const history = order.stageHistory as Array<Record<string, unknown>>;
    history.push({
      stage: "BOM_CALCULATED",
      date: new Date().toISOString(),
      note: `BOM hesaplandı — ${bomResult.summary.totalFabricKg} kg kumaş, ${bomResult.summary.totalElasticM} m lastik`,
      changedBy: admin.name || admin.email,
    });

    await db.fullProductionOrder.update({
      where: { id },
      data: { stage: "BOM_CALCULATED", stageHistory: JSON.parse(JSON.stringify(history)) },
    });

    // Create tracking entry
    await db.productionTracking.create({
      data: {
        productionOrderId: id,
        stage: "BOM_CALCULATED",
        progress: 10,
        notes: `BOM hesaplandı — ${bomResult.summary.totalPieces} adet, ${bomResult.summary.totalWeightKg} kg toplam`,
      },
    });
  }

  return NextResponse.json({
    bom,
    summary: bomResult.summary,
    breakdown: bomResult.breakdown,
  });
}
