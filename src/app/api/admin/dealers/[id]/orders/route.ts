"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET — dealer order history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("dealers", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const [orders, total, summary] = await Promise.all([
    db.order.findMany({
      where: { dealerId: id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            productSnapshot: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.order.count({ where: { dealerId: id } }),
    db.order.aggregate({
      where: {
        dealerId: id,
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  // Monthly order data for chart (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const monthlyOrders = await db.order.groupBy({
    by: ["createdAt"],
    where: {
      dealerId: id,
      createdAt: { gte: twelveMonthsAgo },
      status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
    },
    _sum: { totalAmount: true },
    _count: true,
  });

  // Aggregate by month
  const monthlyMap = new Map<string, { count: number; total: number }>();
  for (const o of monthlyOrders) {
    const date = new Date(o.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthlyMap.get(key) || { count: 0, total: 0 };
    monthlyMap.set(key, {
      count: existing.count + o._count,
      total: existing.total + (o._sum.totalAmount || 0),
    });
  }

  const monthlyData = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return NextResponse.json({
    orders,
    total,
    totalRevenue: summary._sum.totalAmount || 0,
    totalOrderCount: summary._count || 0,
    monthlyData,
  });
}
