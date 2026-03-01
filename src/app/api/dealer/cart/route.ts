import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";

export async function GET() {
  const dealer = await getDealerSession();
  if (!dealer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db.cartItem.findMany({
    where: { dealerId: dealer.id },
    include: {
      product: { select: { name: true, basePrice: true, images: true, dealerPrices: { where: { OR: [{ dealerId: dealer.id }, { dealerId: null }] } } } },
      variant: { select: { color: true, colorHex: true, size: true, sku: true, stock: true } },
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

  // Check if item already in cart
  const existing = await db.cartItem.findFirst({
    where: { dealerId: dealer.id, productId, variantId },
  });

  if (existing) {
    await db.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await db.cartItem.create({
      data: { dealerId: dealer.id, productId, variantId, quantity },
    });
  }

  return NextResponse.json({ success: true });
}
