import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function checkAdmin() {
  const session = await auth();
  const role = (session?.user as unknown as { role: string } | undefined)?.role;
  return role === "ADMIN";
}

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [products, dealers, prices] = await Promise.all([
    db.product.findMany({ where: { active: true }, select: { id: true, name: true, basePrice: true }, orderBy: { name: "asc" } }),
    db.dealer.findMany({ where: { status: "ACTIVE" }, select: { id: true, companyName: true, dealerCode: true }, orderBy: { companyName: "asc" } }),
    db.dealerPrice.findMany(),
  ]);

  return NextResponse.json({ products, dealers, prices });
}

export async function PUT(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prices } = await req.json();

  // Delete all existing and recreate (admin panel full-matrix save)
  await db.dealerPrice.deleteMany();

  if (prices?.length > 0) {
    await db.dealerPrice.createMany({
      data: prices.map((p: { productId: string; dealerId: string | null; wholesalePrice: number; minQuantity?: number }) => ({
        productId: p.productId,
        dealerId: p.dealerId,
        wholesalePrice: p.wholesalePrice,
        minQuantity: p.minQuantity || 1,
      })),
    });
  }

  return NextResponse.json({ success: true });
}

/**
 * PATCH: Tekil ürün/bayi fiyat güncelleme (upsert)
 * AI asistan ve tekil güncellemeler için — diğer fiyatları silmez
 */
export async function PATCH(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId, dealerId, wholesalePrice, minQuantity } = await req.json();

  if (!productId || wholesalePrice === undefined) {
    return NextResponse.json(
      { error: "productId ve wholesalePrice gerekli" },
      { status: 400 }
    );
  }

  // Upsert: varsa güncelle, yoksa oluştur
  const existing = await db.dealerPrice.findFirst({
    where: { productId, dealerId: dealerId || null },
  });

  if (existing) {
    await db.dealerPrice.update({
      where: { id: existing.id },
      data: { wholesalePrice, minQuantity: minQuantity || 1 },
    });
  } else {
    await db.dealerPrice.create({
      data: {
        productId,
        dealerId: dealerId || null,
        wholesalePrice,
        minQuantity: minQuantity || 1,
      },
    });
  }

  return NextResponse.json({ success: true, productId, dealerId, wholesalePrice });
}
