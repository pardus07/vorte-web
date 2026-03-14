import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";

const DOZEN = 12;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const dealer = await getDealerSession();
  if (!dealer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { quantity } = await req.json();

  // Verify ownership
  const item = await db.cartItem.findFirst({
    where: { id, dealerId: dealer.id },
  });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Stand paketi ürünleri değiştirilemez
  if (item.standPackageId) {
    return NextResponse.json(
      { error: "Stand paketi ürünlerinin adeti değiştirilemez. Paketi kaldırıp yeniden ekleyin." },
      { status: 400 }
    );
  }

  // Düzine kontrolü — 12'nin altına düşerse sil
  if (quantity < DOZEN) {
    await db.cartItem.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: true });
  }

  // 12'nin katına yuvarla
  const rounded = Math.max(DOZEN, Math.round(quantity / DOZEN) * DOZEN);

  const updated = await db.cartItem.update({
    where: { id },
    data: { quantity: rounded },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const dealer = await getDealerSession();
  if (!dealer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const item = await db.cartItem.findFirst({
    where: { id, dealerId: dealer.id },
  });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.cartItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
