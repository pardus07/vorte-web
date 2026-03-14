import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { calculateBOM, type BOMInput } from "@/lib/production/bom-calculator";
import { calculateTermin } from "@/lib/production/termin-calculator";

const createSchema = z.object({
  dealerOrderId: z.string().optional(),
  dealerId: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      sku: z.string().min(1),
      productName: z.string().min(1),
      color: z.string().min(1),
      sizeS: z.number().int().min(0).default(0),
      sizeM: z.number().int().min(0).default(0),
      sizeL: z.number().int().min(0).default(0),
      sizeXL: z.number().int().min(0).default(0),
      sizeXXL: z.number().int().min(0).default(0),
    })
  ).min(1),
  autoBOM: z.boolean().default(true),
});

// GET — list full production orders
export async function GET(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
  const stage = searchParams.get("stage");
  const priority = searchParams.get("priority");
  const search = searchParams.get("search");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (stage && stage !== "all") where.stage = stage;
  if (priority && priority !== "all") where.priority = priority;
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { items: { some: { productName: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [orders, total] = await Promise.all([
    db.fullProductionOrder.findMany({
      where,
      include: {
        items: true,
        bomCalculation: { select: { id: true, totalFabricKg: true, estimatedCost: true, calculatedAt: true } },
        _count: { select: { tracking: true, qualityChecks: true, supplierOrders: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.fullProductionOrder.count({ where }),
  ]);

  // Stage stats
  const stageCounts = await db.fullProductionOrder.groupBy({
    by: ["stage"],
    _count: true,
  });
  const stats: Record<string, number> = {};
  for (const s of stageCounts) {
    stats[s.stage] = s._count;
  }

  // Total quantity across all orders
  const totalQtyAgg = await db.fullProductionOrder.aggregate({
    _sum: { totalQuantity: true },
  });
  stats.totalQuantity = totalQtyAgg._sum.totalQuantity || 0;

  return NextResponse.json({ orders, total, stats, page, limit });
}

// POST — create full production order with auto BOM + termin
export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
  }

  const { items, priority, notes, dealerOrderId, dealerId, autoBOM } = parsed.data;

  try {
    // Generate order number: PO-YYYY-NNN
    const year = new Date().getFullYear();
    const lastOrder = await db.fullProductionOrder.findFirst({
      where: { orderNumber: { startsWith: `PO-${year}` } },
      orderBy: { orderNumber: "desc" },
    });
    const nextNum = lastOrder
      ? parseInt(lastOrder.orderNumber.split("-")[2]) + 1
      : 1;
    const orderNumber = `PO-${year}-${String(nextNum).padStart(3, "0")}`;

    // Calculate total quantity
    const totalQuantity = items.reduce(
      (sum, item) => sum + item.sizeS + item.sizeM + item.sizeL + item.sizeXL + item.sizeXXL,
      0,
    );

    // Calculate termin
    const termin = calculateTermin(totalQuantity);

    // Create order with items
    const order = await db.fullProductionOrder.create({
      data: {
        orderNumber,
        dealerOrderId,
        dealerId,
        priority,
        notes,
        estimatedDelivery: termin.estimatedDelivery,
        stageHistory: JSON.parse(JSON.stringify([
          {
            stage: "PENDING",
            date: new Date().toISOString(),
            note: "Üretim siparişi oluşturuldu",
            changedBy: admin.name || admin.email,
          },
        ])),
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            sku: item.sku,
            productName: item.productName,
            color: item.color,
            sizeS: item.sizeS,
            sizeM: item.sizeM,
            sizeL: item.sizeL,
            sizeXL: item.sizeXL,
            sizeXXL: item.sizeXXL,
            totalQuantity: item.sizeS + item.sizeM + item.sizeL + item.sizeXL + item.sizeXXL,
          })),
        },
      },
      include: { items: true },
    });

    // Auto BOM calculation
    let bomResult = null;
    if (autoBOM) {
      const bomInputs: BOMInput[] = items.map((item) => ({
        sku: item.sku,
        productName: item.productName,
        color: item.color,
        sizeS: item.sizeS,
        sizeM: item.sizeM,
        sizeL: item.sizeL,
        sizeXL: item.sizeXL,
        sizeXXL: item.sizeXXL,
      }));

      bomResult = calculateBOM(bomInputs);

      await db.bOMCalculation.create({
        data: {
          productionOrderId: order.id,
          materials: JSON.parse(JSON.stringify(bomResult.materials)),
          totalFabricKg: bomResult.summary.totalFabricKg,
          totalLiningKg: bomResult.summary.totalLiningKg,
          totalElasticM: bomResult.summary.totalElasticM,
          totalThreadM: bomResult.summary.totalThreadM,
          totalLabels: bomResult.summary.totalLabels,
          totalPackaging: bomResult.summary.totalPackaging,
        },
      });

      // Update stage to BOM_CALCULATED
      const newHistory = [
        ...(order.stageHistory as Array<Record<string, unknown>>),
        {
          stage: "BOM_CALCULATED",
          date: new Date().toISOString(),
          note: `BOM otomatik hesaplandı — ${bomResult.summary.totalFabricKg} kg kumaş, ${bomResult.summary.totalElasticM} m lastik`,
          changedBy: "Sistem",
        },
      ];

      await db.fullProductionOrder.update({
        where: { id: order.id },
        data: { stage: "BOM_CALCULATED", stageHistory: JSON.parse(JSON.stringify(newHistory)) },
      });

      // Create tracking entry
      await db.productionTracking.create({
        data: {
          productionOrderId: order.id,
          stage: "BOM_CALCULATED",
          progress: 10,
          notes: "BOM otomatik hesaplandı",
        },
      });
    }

    return NextResponse.json(
      {
        order: { ...order, stage: autoBOM ? "BOM_CALCULATED" : "PENDING" },
        bom: bomResult,
        termin: {
          mode: termin.mode,
          totalBusinessDays: termin.totalBusinessDays,
          estimatedDelivery: termin.estimatedDelivery.toISOString(),
          stages: termin.stages,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Production order create error:", error);
    return NextResponse.json({ error: "Üretim siparişi oluşturulamadı" }, { status: 500 });
  }
}
