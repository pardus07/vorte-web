"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createProductionSchema = z.object({
  productId: z.string().min(1),
  variants: z.array(
    z.object({
      color: z.string(),
      size: z.string(),
      quantity: z.number().int().positive(),
    })
  ),
  targetDate: z.string().min(1),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  materialCost: z.number().optional(),
  laborCost: z.number().optional(),
  notes: z.string().optional(),
});

// GET — list production orders
export async function GET(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (priority && priority !== "all") where.priority = priority;
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { product: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [orders, total, statusCounts] = await Promise.all([
    db.productionOrder.findMany({
      where,
      include: {
        product: { select: { name: true, images: true } },
        _count: { select: { logs: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.productionOrder.count({ where }),
    db.productionOrder.groupBy({
      by: ["status"],
      _count: true,
      _sum: { totalQuantity: true },
    }),
  ]);

  const stats = {
    planned: 0,
    cutting: 0,
    sewing: 0,
    quality: 0,
    packaging: 0,
    completed: 0,
    totalQuantity: 0,
  };
  for (const s of statusCounts) {
    stats[s.status as keyof typeof stats] = s._count;
    stats.totalQuantity += s._sum.totalQuantity || 0;
  }

  return NextResponse.json({ orders, total, stats });
}

// POST — create production order
export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const parsed = createProductionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { productId, variants, targetDate, priority, materialCost, laborCost, notes } = parsed.data;

  // Generate order number: ÜRT-YYYY-NNN
  const year = new Date().getFullYear();
  const lastOrder = await db.productionOrder.findFirst({
    where: { orderNumber: { startsWith: `ÜRT-${year}` } },
    orderBy: { orderNumber: "desc" },
  });
  const nextNum = lastOrder
    ? parseInt(lastOrder.orderNumber.split("-")[2]) + 1
    : 1;
  const orderNumber = `ÜRT-${year}-${String(nextNum).padStart(3, "0")}`;

  const totalQuantity = variants.reduce((sum, v) => sum + v.quantity, 0);

  const order = await db.productionOrder.create({
    data: {
      orderNumber,
      productId,
      variants: JSON.parse(JSON.stringify(variants)),
      totalQuantity,
      targetDate: new Date(targetDate),
      priority,
      materialCost,
      laborCost,
      notes,
    },
    include: { product: { select: { name: true } } },
  });

  // Create initial log
  await db.productionLog.create({
    data: {
      productionOrderId: order.id,
      fromStatus: "",
      toStatus: "planned",
      note: "Üretim emri oluşturuldu",
      changedBy: admin.name || admin.email,
    },
  });

  return NextResponse.json(order, { status: 201 });
}
