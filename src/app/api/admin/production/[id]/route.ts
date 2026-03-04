"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["planned", "cutting", "sewing", "quality", "packaging", "completed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  startDate: z.string().optional().nullable(),
  targetDate: z.string().optional(),
  materialCost: z.number().optional().nullable(),
  laborCost: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  variants: z
    .array(z.object({ color: z.string(), size: z.string(), quantity: z.number().int().positive() }))
    .optional(),
  statusNote: z.string().optional(),
});

// GET — single production order with logs
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  const order = await db.productionOrder.findUnique({
    where: { id },
    include: {
      product: {
        select: { name: true, images: true, basePrice: true, costPrice: true, variants: { select: { color: true, size: true, stock: true } } },
      },
      logs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Üretim emri bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(order);
}

// PUT — update production order
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  const existing = await db.productionOrder.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Üretim emri bulunamadı" }, { status: 404 });
  }

  const { status, statusNote, variants, ...rest } = parsed.data;

  const updateData: Record<string, unknown> = {};

  // Handle date fields
  if (rest.startDate !== undefined) {
    updateData.startDate = rest.startDate ? new Date(rest.startDate) : null;
  }
  if (rest.targetDate) {
    updateData.targetDate = new Date(rest.targetDate);
  }
  if (rest.priority) updateData.priority = rest.priority;
  if (rest.materialCost !== undefined) updateData.materialCost = rest.materialCost;
  if (rest.laborCost !== undefined) updateData.laborCost = rest.laborCost;
  if (rest.notes !== undefined) updateData.notes = rest.notes;

  // Handle variants update
  if (variants) {
    updateData.variants = JSON.parse(JSON.stringify(variants));
    updateData.totalQuantity = variants.reduce((sum, v) => sum + v.quantity, 0);
  }

  // Handle status change
  if (status && status !== existing.status) {
    updateData.status = status;

    // Auto-set startDate when moving from planned
    if (existing.status === "planned" && status !== "planned" && !existing.startDate) {
      updateData.startDate = new Date();
    }

    // Auto-set completedDate when completed
    if (status === "completed") {
      updateData.completedDate = new Date();
    }

    // Create log
    await db.productionLog.create({
      data: {
        productionOrderId: id,
        fromStatus: existing.status,
        toStatus: status,
        note: statusNote || null,
        changedBy: admin.name || admin.email,
      },
    });
  }

  const updated = await db.productionOrder.update({
    where: { id },
    data: updateData,
    include: {
      product: { select: { name: true, images: true } },
      logs: { orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE — delete production order
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  const order = await db.productionOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Üretim emri bulunamadı" }, { status: 404 });
  }

  // Don't allow deleting active production
  if (!["planned", "completed"].includes(order.status)) {
    return NextResponse.json(
      { error: "Aktif üretim emri silinemez. Önce iptal edin veya tamamlayın." },
      { status: 400 }
    );
  }

  await db.productionLog.deleteMany({ where: { productionOrderId: id } });
  await db.productionOrder.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
