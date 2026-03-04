"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const tierSchema = z.object({
  tier: z.string().min(1),
  discountRate: z.number().min(0).max(100),
  minOrderAmount: z.number().min(0),
  paymentTermDays: z.number().min(0),
  description: z.string().optional(),
});

// GET — list all tier settings
export async function GET() {
  const admin = await requirePermission("dealers", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const tiers = await db.dealerTierDiscount.findMany({
    orderBy: { discountRate: "asc" },
  });

  // Count dealers per tier
  const dealerCounts = await db.dealer.groupBy({
    by: ["dealerTier"],
    _count: true,
  });
  const countMap = Object.fromEntries(dealerCounts.map((d) => [d.dealerTier, d._count]));

  const enriched = tiers.map((t) => ({
    ...t,
    dealerCount: countMap[t.tier] || 0,
  }));

  return NextResponse.json(enriched);
}

// POST — create or update tier
export async function POST(req: NextRequest) {
  const admin = await requirePermission("settings", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const parsed = tierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  const { tier, ...data } = parsed.data;

  const result = await db.dealerTierDiscount.upsert({
    where: { tier },
    create: { tier, ...data },
    update: data,
  });

  return NextResponse.json(result);
}

// DELETE — remove tier
export async function DELETE(req: NextRequest) {
  const admin = await requirePermission("settings", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier");
  if (!tier) return NextResponse.json({ error: "Tier belirtilmedi" }, { status: 400 });

  // Don't allow deleting if dealers use this tier
  const dealerCount = await db.dealer.count({ where: { dealerTier: tier } });
  if (dealerCount > 0) {
    return NextResponse.json(
      { error: `Bu seviyeyi kullanan ${dealerCount} bayi var. Önce bayilerin seviyelerini değiştirin.` },
      { status: 400 }
    );
  }

  await db.dealerTierDiscount.delete({ where: { tier } });
  return NextResponse.json({ success: true });
}
