import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug, active: true },
    include: {
      category: true,
      variants: {
        where: { active: true },
        orderBy: [{ color: "asc" }, { size: "asc" }],
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(product);
}
