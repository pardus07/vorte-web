import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const products = await db.product.findMany({
    where: {
      active: true,
      name: { contains: q, mode: "insensitive" },
    },
    select: {
      name: true,
      slug: true,
      category: { select: { slug: true } },
    },
    take: 5,
    orderBy: { name: "asc" },
  });

  const suggestions = products.map((p) => ({
    name: p.name,
    url: `/urun/${p.slug}`,
  }));

  return NextResponse.json(suggestions);
}
