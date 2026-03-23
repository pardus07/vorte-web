import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET — compare quotes by category
export async function GET(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  if (!category) {
    return NextResponse.json(
      { error: "category parametresi gerekli" },
      { status: 400 }
    );
  }

  // Fetch all quotes for this category that have pricing info
  const allQuotes = await db.supplierQuote.findMany({
    where: { category },
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          type: true,
          contactName: true,
          leadTimeDays: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter quotes that have received pricing for comparison
  const pricedQuotes = allQuotes.filter(
    (q) => q.unitPrice !== null && q.status !== "PENDING" && q.status !== "REJECTED"
  );

  // Find cheapest (by unitPrice)
  let cheapest = null;
  if (pricedQuotes.length > 0) {
    cheapest = pricedQuotes.reduce((min, q) =>
      (q.unitPrice ?? Infinity) < (min.unitPrice ?? Infinity) ? q : min
    );
  }

  // Find fastest delivery (by leadTimeDays)
  const quotesWithLeadTime = pricedQuotes.filter((q) => q.leadTimeDays !== null);
  let fastest = null;
  if (quotesWithLeadTime.length > 0) {
    fastest = quotesWithLeadTime.reduce((min, q) =>
      (q.leadTimeDays ?? Infinity) < (min.leadTimeDays ?? Infinity) ? q : min
    );
  }

  // Recommended: balanced score (normalize price + lead time, lower is better)
  let recommended = null;
  if (pricedQuotes.length > 0) {
    const maxPrice = Math.max(...pricedQuotes.map((q) => q.unitPrice ?? 0));
    const maxLead = Math.max(...quotesWithLeadTime.map((q) => q.leadTimeDays ?? 0)) || 1;

    let bestScore = Infinity;
    for (const q of pricedQuotes) {
      const priceScore = maxPrice > 0 ? (q.unitPrice ?? maxPrice) / maxPrice : 0;
      const leadScore = q.leadTimeDays !== null ? q.leadTimeDays / maxLead : 0.5;
      // 60% price weight, 40% delivery speed weight
      const score = priceScore * 0.6 + leadScore * 0.4;
      if (score < bestScore) {
        bestScore = score;
        recommended = q;
      }
    }
  }

  return NextResponse.json({
    quotes: allQuotes,
    cheapest,
    fastest,
    recommended,
    summary: {
      total: allQuotes.length,
      withPricing: pricedQuotes.length,
      pending: allQuotes.filter((q) => q.status === "PENDING" || q.status === "SENT").length,
      received: allQuotes.filter((q) => q.status === "RECEIVED").length,
      accepted: allQuotes.filter((q) => q.status === "ACCEPTED").length,
      rejected: allQuotes.filter((q) => q.status === "REJECTED").length,
    },
  });
}
