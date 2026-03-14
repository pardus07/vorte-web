import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";

const DOZEN = 12;

export async function GET() {
  const dealer = await getDealerSession();
  if (!dealer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db.cartItem.findMany({
    where: { dealerId: dealer.id },
    select: {
      id: true,
      quantity: true,
      standPackageId: true,
      standPackageType: true,
      product: {
        select: {
          name: true,
          basePrice: true,
          images: true,
          dealerPrices: {
            where: { OR: [{ dealerId: dealer.id }, { dealerId: null }] },
          },
        },
      },
      variant: {
        select: { color: true, colorHex: true, size: true, sku: true, stock: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const dealer = await getDealerSession();
  if (!dealer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId, variantId, quantity } = await req.json();

  // Düzine kontrolü — minimum 12, 12'nin katı olmalı
  if (!quantity || quantity < DOZEN || quantity % DOZEN !== 0) {
    return NextResponse.json(
      { error: `Minimum sipariş 1 düzine (${DOZEN} adet). Adet ${DOZEN}'nin katı olmalıdır.` },
      { status: 400 }
    );
  }

  // Check if item already in cart
  const existing = await db.cartItem.findFirst({
    where: { dealerId: dealer.id, productId, variantId },
  });

  if (existing) {
    const newQty = existing.quantity + quantity;
    // Toplam da 12'nin katı olmalı
    const rounded = Math.round(newQty / DOZEN) * DOZEN;
    await db.cartItem.update({
      where: { id: existing.id },
      data: { quantity: Math.max(DOZEN, rounded) },
    });
  } else {
    await db.cartItem.create({
      data: { dealerId: dealer.id, productId, variantId, quantity },
    });
  }

  return NextResponse.json({ success: true });
}
