"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { generateDealerCode } from "@/lib/utils";
import bcryptjs from "bcryptjs";
import { z } from "zod";

const createDealerSchema = z.object({
  companyName: z.string().min(1),
  taxNumber: z.string().min(1),
  taxOffice: z.string().min(1),
  contactName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  city: z.string().min(1),
  district: z.string().min(1),
  address: z.string().min(1),
  password: z.string().min(6),
  shopAddress: z.string().optional(),
  shopCity: z.string().optional(),
  shopDistrict: z.string().optional(),
  dealerTier: z.string().optional(),
  discountRate: z.number().optional(),
  creditLimit: z.number().optional(),
  minOrderAmount: z.number().optional(),
  minOrderQuantity: z.number().optional(),
  paymentTermDays: z.number().optional(),
  notes: z.string().optional(),
});

// GET — list dealers with filters, search, pagination
export async function GET(req: NextRequest) {
  const admin = await requirePermission("dealers", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const tier = searchParams.get("tier") || "";
  const city = searchParams.get("city") || "";
  const sort = searchParams.get("sort") || "newest";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { dealerCode: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
      { taxNumber: { contains: search } },
    ];
  }

  if (status) where.status = status;
  if (tier) where.dealerTier = tier;
  if (city) where.city = { contains: city, mode: "insensitive" };

  // Sorting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any = { createdAt: "desc" };
  switch (sort) {
    case "oldest": orderBy = { createdAt: "asc" }; break;
    case "name": orderBy = { companyName: "asc" }; break;
    case "balance_desc": orderBy = { creditBalance: "desc" }; break;
    case "balance_asc": orderBy = { creditBalance: "asc" }; break;
  }

  const [dealers, total] = await Promise.all([
    db.dealer.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        taxNumber: true,
        dealerCode: true,
        contactName: true,
        phone: true,
        email: true,
        city: true,
        district: true,
        dealerTier: true,
        discountRate: true,
        creditLimit: true,
        creditBalance: true,
        status: true,
        approvedAt: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.dealer.count({ where }),
  ]);

  // Status counts for tabs
  const statusCounts = await db.dealer.groupBy({
    by: ["status"],
    _count: true,
  });

  // Tier counts
  const tierCounts = await db.dealer.groupBy({
    by: ["dealerTier"],
    _count: true,
  });

  // Total revenue per dealer (from completed orders)
  const dealerIds = dealers.map((d) => d.id);
  const revenueData = dealerIds.length > 0
    ? await db.order.groupBy({
        by: ["dealerId"],
        where: {
          dealerId: { in: dealerIds },
          status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
        },
        _sum: { totalAmount: true },
        _count: true,
      })
    : [];

  const revenueMap = new Map(
    revenueData.map((r) => [r.dealerId, { total: r._sum.totalAmount || 0, count: r._count }])
  );

  const enrichedDealers = dealers.map((d) => ({
    ...d,
    totalRevenue: revenueMap.get(d.id)?.total || 0,
    paidOrderCount: revenueMap.get(d.id)?.count || 0,
  }));

  return NextResponse.json({
    dealers: enrichedDealers,
    total,
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
    tierCounts: Object.fromEntries(tierCounts.map((t) => [t.dealerTier, t._count])),
  });
}

// POST — create new dealer
export async function POST(req: NextRequest) {
  const admin = await requirePermission("dealers", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const parsed = createDealerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
  }

  const { password, ...data } = parsed.data;

  const existing = await db.dealer.findFirst({
    where: { OR: [{ taxNumber: data.taxNumber }, { email: data.email }] },
  });
  if (existing) {
    return NextResponse.json({ error: "Bu vergi no veya e-posta zaten kayıtlı" }, { status: 400 });
  }

  const dealerCode = generateDealerCode();
  const passwordHash = await bcryptjs.hash(password, 12);

  const dealer = await db.dealer.create({
    data: {
      ...data,
      dealerCode,
      passwordHash,
      status: "ACTIVE",
      approvedAt: new Date(),
      approvedBy: admin.userId,
    },
  });

  await db.notification.create({
    data: {
      type: "NEW_DEALER",
      title: "Yeni Bayi Eklendi",
      message: `${data.companyName} (${dealerCode}) sisteme eklendi.`,
    },
  });

  return NextResponse.json(dealer, { status: 201 });
}
