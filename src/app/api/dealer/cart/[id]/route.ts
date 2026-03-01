import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";

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

  const updated = await db.cartItem.update({
    where: { id },
    data: { quantity },
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
