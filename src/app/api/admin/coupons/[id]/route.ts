"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET — single coupon
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const coupon = await db.coupon.findUnique({ where: { id } });
  if (!coupon) return NextResponse.json({ error: "Kupon bulunamadı" }, { status: 404 });
  return NextResponse.json(coupon);
}

// PUT — update coupon
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  const fields = [
    "name", "discountType", "discountValue", "minAmount", "maxUses", "maxUsesPerUser",
    "active", "campaignType", "freeShipping", "buyQuantity", "getQuantity",
    "orderScope", "applicableProducts", "applicableCategories", "description",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) updateData[f] = body[f];
  }
  if (body.startsAt !== undefined) updateData.startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  const coupon = await db.coupon.update({ where: { id }, data: updateData });
  return NextResponse.json(coupon);
}

// PATCH — toggle active
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const coupon = await db.coupon.update({
    where: { id },
    data: { active: body.active },
  });
  return NextResponse.json(coupon);
}

// DELETE — delete coupon
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  await db.coupon.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
