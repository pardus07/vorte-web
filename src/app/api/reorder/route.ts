import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET — Siparişi tekrarla: ürünleri sepete ekle ve sepet sayfasına yönlendir
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/giris", req.url));
  }

  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.redirect(new URL("/hesabim/siparislerim", req.url));
  }

  try {
    const order = await db.order.findUnique({
      where: { id: orderId, userId: session.user.id },
      include: {
        items: {
          include: {
            variant: { select: { id: true, stock: true, active: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.redirect(new URL("/hesabim/siparislerim", req.url));
    }

    let addedCount = 0;

    for (const item of order.items) {
      // Stokta ve aktif olan varyantları ekle
      if (!item.variant.active || item.variant.stock <= 0) continue;

      const existingCartItem = await db.cartItem.findFirst({
        where: { userId: session.user.id, variantId: item.variantId },
      });

      const qtyToAdd = Math.min(item.quantity, item.variant.stock);

      if (existingCartItem) {
        await db.cartItem.update({
          where: { id: existingCartItem.id },
          data: { quantity: Math.min(existingCartItem.quantity + qtyToAdd, item.variant.stock) },
        });
      } else {
        await db.cartItem.create({
          data: {
            userId: session.user.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: qtyToAdd,
          },
        });
      }
      addedCount++;
    }

    // Sepet sayfasına yönlendir
    const redirectUrl = new URL("/sepet", req.url);
    if (addedCount > 0) {
      redirectUrl.searchParams.set("reorder", "1");
    } else {
      redirectUrl.searchParams.set("reorder", "empty");
    }
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[API:reorder] Sipariş tekrarlama hatası:", {
      error: error instanceof Error ? error.message : error,
      orderId,
    });
    return NextResponse.redirect(new URL("/hesabim/siparislerim", req.url));
  }
}
