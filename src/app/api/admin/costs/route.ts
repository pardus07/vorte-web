import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const productId = sp.get("productId") || "";

  if (productId) {
    // Get cost history for a specific product
    const costs = await db.productCost.findMany({
      where: { productId },
      orderBy: { calculatedAt: "desc" },
      take: 20,
    });

    const product = await db.product.findUnique({
      where: { id: productId },
      select: { name: true, basePrice: true, costPrice: true },
    });

    return NextResponse.json({ costs, product });
  }

  // Get latest cost for all products
  const products = await db.product.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      basePrice: true,
      costPrice: true,
      productCosts: {
        orderBy: { calculatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ products });
}

const costSchema = z.object({
  productId: z.string().min(1),
  materialCost: z.number().min(0),
  laborCost: z.number().min(0),
  overheadCost: z.number().min(0),
  packagingCost: z.number().min(0),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "w");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = costSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veriler", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { productId, materialCost, laborCost, overheadCost, packagingCost, notes } = parsed.data;
  const totalCost = materialCost + laborCost + overheadCost + packagingCost;

  // Create cost record
  const cost = await db.productCost.create({
    data: {
      productId,
      materialCost,
      laborCost,
      overheadCost,
      packagingCost,
      totalCost,
      notes,
    },
  });

  // Update product's costPrice
  await db.product.update({
    where: { id: productId },
    data: { costPrice: totalCost },
  });

  return NextResponse.json(cost);
}
