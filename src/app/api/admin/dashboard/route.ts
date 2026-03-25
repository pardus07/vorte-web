import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requirePermission("orders", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Parallel queries
    const [
      todayOrders,
      todayRevenue,
      weekOrders,
      weekRevenue,
      monthOrders,
      monthRevenue,
      pendingOrders,
      lowStockVariants,
      activeDealers,
      pendingDealers,
      unreadMessages,
      recentOrders,
      lowStockList,
      unreadMessagesList,
      todayProduction,
      totalCustomers,
      allOrders30d,
    ] = await Promise.all([
      // Today stats
      db.order.count({ where: { createdAt: { gte: today } } }),
      db.order.aggregate({
        where: { createdAt: { gte: today }, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        _sum: { totalAmount: true },
      }),
      // Week stats
      db.order.count({ where: { createdAt: { gte: weekAgo } } }),
      db.order.aggregate({
        where: { createdAt: { gte: weekAgo }, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        _sum: { totalAmount: true },
      }),
      // Month stats
      db.order.count({ where: { createdAt: { gte: monthStart } } }),
      db.order.aggregate({
        where: { createdAt: { gte: monthStart }, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        _sum: { totalAmount: true },
      }),
      // Pending orders
      db.order.count({ where: { status: "PENDING" } }),
      // Low stock
      db.variant.count({ where: { stock: { lte: 5 }, active: true } }),
      // Dealers
      db.dealer.count({ where: { status: "ACTIVE" } }),
      db.dealer.count({ where: { status: "PENDING" } }),
      // Unread messages
      db.contactMessage.count({ where: { read: false } }),
      // Recent orders (last 10)
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          type: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
      // Low stock list
      db.variant.findMany({
        where: { stock: { lte: 5 }, active: true },
        include: { product: { select: { name: true, slug: true } } },
        orderBy: { stock: "asc" },
        take: 10,
      }),
      // Unread messages list
      db.contactMessage.findMany({
        where: { read: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, subject: true, createdAt: true },
      }),
      // Today's production
      db.productionOrder.findMany({
        where: { status: { notIn: ["completed"] } },
        select: { id: true, orderNumber: true, status: true, totalQuantity: true, targetDate: true },
        orderBy: { targetDate: "asc" },
        take: 5,
      }),
      // Total customers
      db.user.count({ where: { role: "CUSTOMER" } }),
      // Orders last 30 days for charts
      db.order.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
        },
        select: {
          totalAmount: true,
          type: true,
          createdAt: true,
        },
      }),
    ]);

    // Build daily sales chart data (last 30 days)
    const dailySales: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailySales[key] = { date: key, revenue: 0, orders: 0 };
    }
    for (const o of allOrders30d) {
      const key = new Date(o.createdAt).toISOString().split("T")[0];
      if (dailySales[key]) {
        dailySales[key].revenue += Number(o.totalAmount || 0);
        dailySales[key].orders += 1;
      }
    }
    const chartDaily = Object.values(dailySales);

    // Retail vs Wholesale comparison
    let retailRevenue = 0;
    let retailCount = 0;
    let wholesaleRevenue = 0;
    let wholesaleCount = 0;
    for (const o of allOrders30d) {
      if (o.type === "WHOLESALE") {
        wholesaleRevenue += Number(o.totalAmount || 0);
        wholesaleCount++;
      } else {
        retailRevenue += Number(o.totalAmount || 0);
        retailCount++;
      }
    }

    // Category sales — varyant bazli (urun + renk + beden kirilimi)
    let categorySales: { name: string; value: number }[] = [];
    try {
      const variantSales = await db.orderItem.groupBy({
        by: ["variantId"],
        where: {
          order: {
            createdAt: { gte: thirtyDaysAgo },
            status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
          },
        },
        _sum: { totalPrice: true },
        orderBy: { _sum: { totalPrice: "desc" } },
        take: 8,
      });

      const variantIds = variantSales.map((v) => v.variantId);
      const variants = await db.variant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, color: true, size: true, product: { select: { name: true } } },
      });
      const varMap = new Map(variants.map((v) => [v.id, v]));

      categorySales = variantSales.map((v) => {
        const variant = varMap.get(v.variantId);
        let name = "Bilinmeyen";
        if (variant) {
          // "Vorte Premium Penye Erkek Boxer Siyah" → "Erkek Boxer Siyah M"
          const shortName = variant.product.name
            .replace(/^Vorte\s+Premium\s+Penye\s+/i, "")
            .replace(/^Vorte\s+/i, "")
            .trim();
          name = `${shortName} ${variant.size}`;
        }
        return { name, value: Number(v._sum.totalPrice || 0) };
      });
    } catch {
      // No order items yet
    }

    return NextResponse.json({
      stats: {
        todayRevenue: Number(todayRevenue._sum.totalAmount || 0),
        todayOrders,
        weekRevenue: Number(weekRevenue._sum.totalAmount || 0),
        weekOrders,
        monthRevenue: Number(monthRevenue._sum.totalAmount || 0),
        monthOrders,
        pendingOrders,
        lowStockVariants,
        activeDealers,
        pendingDealers,
        unreadMessages,
        totalCustomers,
      },
      charts: {
        daily: chartDaily,
        categorySales,
        comparison: {
          retail: { revenue: retailRevenue, count: retailCount },
          wholesale: { revenue: wholesaleRevenue, count: wholesaleCount },
        },
      },
      quickAccess: {
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          totalAmount: Number(o.totalAmount),
          status: o.status,
          orderType: o.type,
          customerName: o.user?.name || "Misafir",
          createdAt: o.createdAt.toISOString(),
        })),
        lowStock: lowStockList.map((v) => ({
          id: v.id,
          productName: v.product.name,
          productSlug: v.product.slug,
          color: v.color,
          size: v.size,
          stock: v.stock,
        })),
        unreadMessages: unreadMessagesList.map((m) => ({
          id: m.id,
          name: m.name,
          subject: m.subject,
          createdAt: m.createdAt.toISOString(),
        })),
        production: todayProduction.map((p) => ({
          id: p.id,
          orderNumber: p.orderNumber,
          status: p.status,
          totalQuantity: p.totalQuantity,
          targetDate: p.targetDate.toISOString(),
        })),
        pendingDealers,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Veri yüklenemedi" }, { status: 500 });
  }
}
