import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const admin = await requirePermission("invoices", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = parseInt(sp.get("limit") || "20");
  const search = sp.get("search") || "";
  const invoiceType = sp.get("type") || "";
  const status = sp.get("status") || "";
  const dateRange = sp.get("dateRange") || "";
  const dateFrom = sp.get("dateFrom") || "";
  const dateTo = sp.get("dateTo") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (invoiceType) {
    where.invoiceType = invoiceType;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { invoiceNo: { contains: search, mode: "insensitive" } },
      { order: { orderNumber: { contains: search, mode: "insensitive" } } },
      { order: { user: { name: { contains: search, mode: "insensitive" } } } },
      { order: { dealer: { companyName: { contains: search, mode: "insensitive" } } } },
    ];
  }

  // Date range
  if (dateRange) {
    const now = new Date();
    let startDate: Date | null = null;
    switch (dateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "custom":
        if (dateFrom) startDate = new Date(dateFrom);
        break;
    }
    if (startDate) {
      where.createdAt = { gte: startDate };
    }
    if (dateRange === "custom" && dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: end };
    }
  }

  const [invoices, total, stats] = await Promise.all([
    db.invoice.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            type: true,
            user: { select: { name: true, email: true } },
            dealer: { select: { companyName: true, dealerCode: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.invoice.count({ where }),
    // Stats
    db.invoice.groupBy({
      by: ["status"],
      _count: true,
      _sum: { totalAmount: true },
    }),
  ]);

  const statusStats: Record<string, { count: number; total: number }> = {};
  stats.forEach((s) => {
    statusStats[s.status] = {
      count: s._count,
      total: s._sum.totalAmount || 0,
    };
  });

  return NextResponse.json({ invoices, total, page, limit, statusStats });
}
