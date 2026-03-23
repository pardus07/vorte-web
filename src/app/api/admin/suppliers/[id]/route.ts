import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET — single supplier with orders and stocks
export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  const supplier = await db.supplier.findUnique({
    where: { id },
    include: {
      orders: {
        include: {
          productionOrder: { select: { orderNumber: true, stage: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      stocks: { orderBy: { name: "asc" } },
    },
  });

  if (!supplier) {
    return NextResponse.json({ error: "Tedarikçi bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(supplier);
}

// PATCH — update supplier
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const existing = await db.supplier.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Tedarikçi bulunamadı" }, { status: 404 });
  }

  const updated = await db.supplier.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.email && { email: body.email }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.type && { type: body.type }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.contactName !== undefined && { contactName: body.contactName }),
      ...(body.materials && { materials: body.materials }),
      ...(body.leadTimeDays !== undefined && { leadTimeDays: body.leadTimeDays }),
      ...(body.minOrderQty !== undefined && { minOrderQty: body.minOrderQty }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE — hard delete (completely remove) or soft delete via query param
export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const soft = req.nextUrl.searchParams.get("soft") === "true";

  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier) {
    return NextResponse.json({ error: "Tedarikçi bulunamadı" }, { status: 404 });
  }

  if (soft) {
    await db.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  } else {
    // Delete related records first
    await db.supplierQuote.deleteMany({ where: { supplierId: id } });
    await db.supplierOrder.deleteMany({ where: { supplierId: id } });
    await db.materialStock.updateMany({ where: { supplierId: id }, data: { supplierId: null } });
    await db.supplier.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
