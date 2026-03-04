"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const couponSchema = z.object({
  code: z.string().min(1),
  name: z.string().optional().nullable(),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.number().positive(),
  minAmount: z.number().optional().nullable(),
  maxUses: z.number().int().optional().nullable(),
  maxUsesPerUser: z.number().int().optional().nullable(),
  startsAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  active: z.boolean().default(true),
  campaignType: z.string().default("general"),
  freeShipping: z.boolean().default(false),
  buyQuantity: z.number().int().optional().nullable(),
  getQuantity: z.number().int().optional().nullable(),
  orderScope: z.enum(["all", "retail", "wholesale"]).default("all"),
  applicableProducts: z.string().optional().nullable(),
  applicableCategories: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export async function GET() {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });

  // Stats
  const now = new Date();
  const stats = {
    total: coupons.length,
    active: coupons.filter((c) => c.active).length,
    expired: coupons.filter((c) => c.expiresAt && new Date(c.expiresAt) < now).length,
    totalUses: coupons.reduce((s, c) => s + c.currentUses, 0),
  };

  return NextResponse.json({ coupons, stats });
}

export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const parsed = couponSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.coupon.findUnique({ where: { code: parsed.data.code } });
  if (existing) {
    return NextResponse.json({ error: "Bu kupon kodu zaten mevcut" }, { status: 400 });
  }

  const { startsAt, expiresAt, ...rest } = parsed.data;
  const coupon = await db.coupon.create({
    data: {
      ...rest,
      startsAt: startsAt ? new Date(startsAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json(coupon, { status: 201 });
}
