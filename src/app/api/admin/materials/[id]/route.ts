import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// PATCH — update material stock (quantity, min, supplier)
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const existing = await db.materialStock.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Malzeme stoku bulunamadı" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (body.quantity !== undefined) {
    updateData.quantity = body.quantity;
    // If quantity increased, update lastRestocked
    if (body.quantity > existing.quantity) {
      updateData.lastRestocked = new Date();
    }
  }
  if (body.minQuantity !== undefined) updateData.minQuantity = body.minQuantity;
  if (body.name) updateData.name = body.name;
  if (body.unit) updateData.unit = body.unit;
  if (body.supplierId !== undefined) updateData.supplierId = body.supplierId || null;

  const updated = await db.materialStock.update({
    where: { id },
    data: updateData,
    include: { supplier: { select: { name: true } } },
  });

  return NextResponse.json(updated);
}

// DELETE — delete material stock
export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  const existing = await db.materialStock.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Malzeme stoku bulunamadı" }, { status: 404 });
  }

  await db.materialStock.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
