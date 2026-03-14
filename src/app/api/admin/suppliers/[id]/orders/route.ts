import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const createOrderSchema = z.object({
  productionOrderId: z.string().optional(),
  materials: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
    })
  ).min(1),
  totalAmount: z.string().optional(),
  expectedDelivery: z.string().optional(),
  notes: z.string().optional(),
});

// GET — list orders for a supplier
export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  const orders = await db.supplierOrder.findMany({
    where: { supplierId: id },
    include: {
      productionOrder: { select: { orderNumber: true, stage: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

// POST — create supplier order + auto update production order stage to MATERIALS_ORDERED
export async function POST(req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id: supplierId } = await params;
  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
  }

  const supplier = await db.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) {
    return NextResponse.json({ error: "Tedarikçi bulunamadı" }, { status: 404 });
  }

  const { productionOrderId, materials, totalAmount, expectedDelivery, notes } = parsed.data;

  // Create supplier order
  const order = await db.supplierOrder.create({
    data: {
      supplierId,
      productionOrderId: productionOrderId || null,
      materials: JSON.parse(JSON.stringify(materials)),
      totalAmount: totalAmount || materials.map((m) => `${m.quantity} ${m.unit} ${m.name}`).join(" + "),
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      notes,
    },
    include: {
      supplier: { select: { name: true } },
      productionOrder: { select: { orderNumber: true, stage: true } },
    },
  });

  // Auto update production order stage to MATERIALS_ORDERED
  if (productionOrderId) {
    const prodOrder = await db.fullProductionOrder.findUnique({
      where: { id: productionOrderId },
    });

    if (prodOrder && ["PENDING", "BOM_CALCULATED"].includes(prodOrder.stage)) {
      const history = prodOrder.stageHistory as Array<Record<string, unknown>>;
      history.push({
        stage: "MATERIALS_ORDERED",
        date: new Date().toISOString(),
        note: `Tedarikçiye sipariş verildi: ${supplier.name} — ${order.totalAmount}`,
        changedBy: admin.name || admin.email,
      });

      await db.fullProductionOrder.update({
        where: { id: productionOrderId },
        data: { stage: "MATERIALS_ORDERED", stageHistory: JSON.parse(JSON.stringify(history)) },
      });

      // Create tracking entry
      await db.productionTracking.create({
        data: {
          productionOrderId,
          stage: "MATERIALS_ORDERED",
          progress: 20,
          notes: `Tedarikçi: ${supplier.name} — ${order.totalAmount}`,
        },
      });
    }
  }

  return NextResponse.json(order, { status: 201 });
}

// PATCH — update supplier order (deliveredAt → auto advance to MATERIALS_RECEIVED)
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id: supplierId } = await params;
  const body = await req.json();
  const { orderId, deliveredAt, confirmedAt, notes } = body as {
    orderId: string;
    deliveredAt?: string;
    confirmedAt?: string;
    notes?: string;
  };

  if (!orderId) {
    return NextResponse.json({ error: "orderId gerekli" }, { status: 400 });
  }

  const supplierOrder = await db.supplierOrder.findFirst({
    where: { id: orderId, supplierId },
    include: { productionOrder: true, supplier: { select: { name: true } } },
  });

  if (!supplierOrder) {
    return NextResponse.json({ error: "Tedarikçi siparişi bulunamadı" }, { status: 404 });
  }

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (confirmedAt) updateData.confirmedAt = new Date(confirmedAt);
  if (notes !== undefined) updateData.notes = notes;

  // deliveredAt set → auto advance production order to MATERIALS_RECEIVED
  if (deliveredAt) {
    updateData.deliveredAt = new Date(deliveredAt);

    if (supplierOrder.productionOrderId && supplierOrder.productionOrder) {
      const prodOrder = supplierOrder.productionOrder;

      // Only advance if currently in MATERIALS_ORDERED stage
      if (prodOrder.stage === "MATERIALS_ORDERED") {
        const history = (prodOrder.stageHistory as Array<Record<string, unknown>>) || [];
        history.push({
          stage: "MATERIALS_RECEIVED",
          date: new Date().toISOString(),
          note: `Malzeme teslim alındı: ${supplierOrder.supplier.name}`,
          changedBy: admin.name || admin.email,
        });

        await db.fullProductionOrder.update({
          where: { id: supplierOrder.productionOrderId },
          data: {
            stage: "MATERIALS_RECEIVED",
            stageHistory: JSON.parse(JSON.stringify(history)),
          },
        });

        // Create tracking entry
        await db.productionTracking.create({
          data: {
            productionOrderId: supplierOrder.productionOrderId,
            stage: "MATERIALS_RECEIVED",
            progress: 30,
            notes: `Malzeme teslim alındı: ${supplierOrder.supplier.name}`,
          },
        });
      }
    }
  }

  const updated = await db.supplierOrder.update({
    where: { id: orderId },
    data: updateData,
    include: {
      supplier: { select: { name: true } },
      productionOrder: { select: { orderNumber: true, stage: true } },
    },
  });

  return NextResponse.json(updated);
}
