import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const admin = await requirePermission("reports", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const period = sp.get("period") || "month"; // today, week, month, year, custom
  const dateFrom = sp.get("dateFrom") || "";
  const dateTo = sp.get("dateTo") || "";

  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case "custom":
      startDate = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
      if (dateTo) {
        endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
      }
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // All orders in range (excluding CANCELLED)
  const orders = await db.order.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: { notIn: ["CANCELLED"] },
    },
    include: {
      items: {
        include: {
          product: { select: { name: true, costPrice: true, categoryId: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Summary stats
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrders = orders.length;
  const retailOrders = orders.filter((o) => o.type === "RETAIL");
  const wholesaleOrders = orders.filter((o) => o.type === "WHOLESALE");
  const refundedOrders = orders.filter((o) => o.status === "REFUNDED");

  // Cost calculation
  let totalCost = 0;
  const productStats: Record<string, { name: string; revenue: number; cost: number; quantity: number; categoryId: string }> = {};

  for (const order of orders) {
    if (order.status === "REFUNDED") continue;
    for (const item of order.items) {
      const cost = (item.product.costPrice || 0) * item.quantity;
      totalCost += cost;

      const key = item.productId;
      if (!productStats[key]) {
        productStats[key] = {
          name: item.product.name,
          revenue: 0,
          cost: 0,
          quantity: 0,
          categoryId: item.product.categoryId,
        };
      }
      productStats[key].revenue += item.totalPrice;
      productStats[key].cost += cost;
      productStats[key].quantity += item.quantity;
    }
  }

  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const avgOrderAmount = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Daily breakdown for charts
  const dailyMap: Record<string, { date: string; revenue: number; cost: number; orders: number }> = {};
  for (const order of orders) {
    if (order.status === "REFUNDED") continue;
    const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { date: dateKey, revenue: 0, cost: 0, orders: 0 };
    }
    dailyMap[dateKey].revenue += order.totalAmount;
    dailyMap[dateKey].orders += 1;
    for (const item of order.items) {
      dailyMap[dateKey].cost += (item.product.costPrice || 0) * item.quantity;
    }
  }

  const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // Top products
  const topProducts = Object.values(productStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((p) => ({
      ...p,
      profit: p.revenue - p.cost,
      margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
    }));

  // Category breakdown
  const categories = await db.category.findMany({ select: { id: true, name: true } });
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const categoryStats: Record<string, { name: string; revenue: number; cost: number; quantity: number }> = {};
  for (const p of Object.values(productStats)) {
    const catName = categoryMap.get(p.categoryId) || "Diğer";
    if (!categoryStats[catName]) {
      categoryStats[catName] = { name: catName, revenue: 0, cost: 0, quantity: 0 };
    }
    categoryStats[catName].revenue += p.revenue;
    categoryStats[catName].cost += p.cost;
    categoryStats[catName].quantity += p.quantity;
  }

  return NextResponse.json({
    summary: {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      totalOrders,
      avgOrderAmount,
      retailCount: retailOrders.length,
      retailRevenue: retailOrders.reduce((s, o) => s + o.totalAmount, 0),
      wholesaleCount: wholesaleOrders.length,
      wholesaleRevenue: wholesaleOrders.reduce((s, o) => s + o.totalAmount, 0),
      refundedCount: refundedOrders.length,
      refundedAmount: refundedOrders.reduce((s, o) => s + o.totalAmount, 0),
    },
    dailyData,
    topProducts,
    categoryStats: Object.values(categoryStats).sort((a, b) => b.revenue - a.revenue),
    period,
    startDate,
    endDate,
  });
}
