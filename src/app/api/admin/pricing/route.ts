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
 * PATCH: Tekil veya toplu ürün/bayi fiyat güncelleme (upsert)
 * AI asistan ve tekil güncellemeler için — diğer fiyatları silmez
 *
 * Tekil:  { productId, dealerId?, wholesalePrice, minQuantity? }
 * Toplu:  { prices: [{ productId, dealerId?, wholesalePrice, minQuantity? }, ...] }
 */
export async function PATCH(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Toplu veya tekil güncelleme listesi oluştur
    const items: { productId: string; dealerId: string | null; wholesalePrice: number; minQuantity: number }[] = [];

    if (Array.isArray(body.prices) && body.prices.length > 0) {
      // Toplu mod
      for (const p of body.prices) {
        if (!p.productId || p.wholesalePrice === undefined) continue;
        items.push({
          productId: p.productId,
          dealerId: p.dealerId && p.dealerId !== "" ? p.dealerId : null,
          wholesalePrice: Number(p.wholesalePrice),
          minQuantity: Number(p.minQuantity) || 1,
        });
      }
    } else if (body.productId && body.wholesalePrice !== undefined) {
      // Tekil mod
      items.push({
        productId: body.productId,
        dealerId: body.dealerId && body.dealerId !== "" ? body.dealerId : null,
        wholesalePrice: Number(body.wholesalePrice),
        minQuantity: Number(body.minQuantity) || 1,
      });
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "productId ve wholesalePrice gerekli (tekil veya prices[] dizisi)" },
        { status: 400 }
      );
    }

    // Her biri için upsert (findFirst + update/create)
    const results = [];
    for (const item of items) {
      try {
        // dealerId null ise özel where kullan (NULL = NULL karşılaştırması)
        const whereClause = item.dealerId
          ? { productId: item.productId, dealerId: item.dealerId }
          : { productId: item.productId, dealerId: null };

        const existing = await db.dealerPrice.findFirst({ where: whereClause });

        if (existing) {
          await db.dealerPrice.update({
            where: { id: existing.id },
            data: { wholesalePrice: item.wholesalePrice, minQuantity: item.minQuantity },
          });
        } else {
          await db.dealerPrice.create({
            data: {
              productId: item.productId,
              dealerId: item.dealerId,
              wholesalePrice: item.wholesalePrice,
              minQuantity: item.minQuantity,
            },
          });
        }
        results.push({ productId: item.productId, dealerId: item.dealerId, wholesalePrice: item.wholesalePrice, status: "ok" });
      } catch (itemErr) {
        console.error(`[pricing PATCH] Fiyat upsert hatası:`, item, itemErr);
        results.push({ productId: item.productId, dealerId: item.dealerId, wholesalePrice: item.wholesalePrice, status: "error", error: String(itemErr) });
      }
    }

    const successCount = results.filter(r => r.status === "ok").length;
    return NextResponse.json({ success: successCount > 0, updated: successCount, total: items.length, results });
  } catch (err) {
    console.error("[pricing PATCH] Genel hata:", err);
    return NextResponse.json(
      { error: `Fiyat güncelleme hatası: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
