import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET — single full production order with all relations
export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  const order = await db.fullProductionOrder.findUnique({
    where: { id },
    include: {
      items: true,
      bomCalculation: true,
      tracking: { orderBy: { createdAt: "desc" } },
      qualityChecks: { orderBy: { createdAt: "desc" } },
      supplierOrders: {
        include: { supplier: { select: { name: true, email: true, type: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Üretim siparişi bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(order);
}

// PATCH — update production order fields (priority, notes, dates)
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const existing = await db.fullProductionOrder.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Üretim siparişi bulunamadı" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (body.priority) updateData.priority = body.priority;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.estimatedDelivery) updateData.estimatedDelivery = new Date(body.estimatedDelivery);
  if (body.actualDelivery) updateData.actualDelivery = new Date(body.actualDelivery);

  const updated = await db.fullProductionOrder.update({
    where: { id },
    data: updateData,
    include: { items: true, bomCalculation: true },
  });

  return NextResponse.json(updated);
}

// DELETE — delete production order (only PENDING or PROD_CANCELLED)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  const order = await db.fullProductionOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Üretim siparişi bulunamadı" }, { status: 404 });
  }

  if (!["PENDING", "PROD_CANCELLED"].includes(order.stage)) {
    return NextResponse.json(
      { error: "Aktif üretim siparişi silinemez. Önce iptal edin." },
      { status: 400 },
    );
  }

  // Cascade deletes items, BOM, tracking, quality checks
  await db.fullProductionOrder.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
