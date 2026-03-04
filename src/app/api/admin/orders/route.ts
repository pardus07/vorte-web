import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const admin = await requirePermission("orders", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = parseInt(sp.get("limit") || "20");
  const search = sp.get("search") || "";
  const status = sp.get("status") || "";
  const type = sp.get("type") || ""; // RETAIL or WHOLESALE
  const dateRange = sp.get("dateRange") || ""; // today, week, month, custom
  const dateFrom = sp.get("dateFrom") || "";
  const dateTo = sp.get("dateTo") || "";
  const sort = sp.get("sort") || "newest"; // newest, oldest, amount_high, amount_low

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  // Status filter
  if (status) {
    where.status = status;
  }

  // Type filter
  if (type) {
    where.type = type;
  }

  // Search
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { phone: { contains: search, mode: "insensitive" } } },
      { dealer: { companyName: { contains: search, mode: "insensitive" } } },
      { cargoTrackingNo: { contains: search, mode: "insensitive" } },
    ];
  }

  // Date range filter
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
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: endDate };
    }
  }

  // Sort
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any = { createdAt: "desc" };
  switch (sort) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "amount_high":
      orderBy = { totalAmount: "desc" };
      break;
    case "amount_low":
      orderBy = { totalAmount: "asc" };
      break;
  }

  const [orders, total, statusCounts] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        dealer: { select: { companyName: true, dealerCode: true } },
        payment: { select: { status: true } },
        _count: { select: { items: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.order.count({ where }),
    // Get counts per status for filter badges
    db.order.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const counts: Record<string, number> = {};
  statusCounts.forEach((s) => {
    counts[s.status] = s._count;
  });

  return NextResponse.json({ orders, total, page, limit, statusCounts: counts });
}
