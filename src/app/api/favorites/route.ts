import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    select: { productId: true },
  });

  return NextResponse.json(favorites.map((f) => f.productId));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const { productId } = await request.json();

  if (!productId) {
    return NextResponse.json({ error: "Ürün ID gerekli" }, { status: 400 });
  }

  // Toggle: if exists delete, otherwise create
  const existing = await db.favorite.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await db.favorite.create({
    data: { userId: session.user.id, productId },
  });

  return NextResponse.json({ favorited: true });
}
