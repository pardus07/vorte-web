import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";

async function verifyCartOwnership(cartItemId: string): Promise<boolean> {
  const session = await auth();
  const userId = session?.user?.id;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("cart-session")?.value;

  const item = await db.cartItem.findUnique({ where: { id: cartItemId } });
  if (!item) return false;

  if (userId && item.userId === userId) return true;
  if (sessionId && item.sessionId === sessionId) return true;
  return false;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!(await verifyCartOwnership(id))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await request.json();
  const { quantity } = body;

  if (!quantity || quantity < 1) {
    return NextResponse.json({ error: "Geçersiz adet" }, { status: 400 });
  }

  const cartItem = await db.cartItem.findUnique({
    where: { id },
    include: { variant: true },
  });

  if (!cartItem) {
    return NextResponse.json({ error: "Sepet öğesi bulunamadı" }, { status: 404 });
  }

  if (quantity > cartItem.variant.stock) {
    return NextResponse.json(
      { error: "Stok miktarını aşamazsınız" },
      { status: 400 }
    );
  }

  const updated = await db.cartItem.update({
    where: { id },
    data: { quantity },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!(await verifyCartOwnership(id))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  await db.cartItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
