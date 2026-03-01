import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";

async function getSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("cart-session")?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }
  return sessionId;
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  const sessionId = !userId ? await getSessionId() : undefined;

  const where = userId ? { userId } : { sessionId };

  const items = await db.cartItem.findMany({
    where,
    include: {
      product: {
        include: { category: true },
      },
      variant: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const total = items.reduce((sum, item) => {
    const price = item.variant.price || item.product.basePrice;
    return sum + price * item.quantity;
  }, 0);

  const response = NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        basePrice: item.product.basePrice,
        images: item.product.images,
        category: item.product.category,
      },
      variant: {
        id: item.variant.id,
        color: item.variant.color,
        colorHex: item.variant.colorHex,
        size: item.variant.size,
        sku: item.variant.sku,
        stock: item.variant.stock,
        price: item.variant.price,
      },
      unitPrice: item.variant.price || item.product.basePrice,
      totalPrice: (item.variant.price || item.product.basePrice) * item.quantity,
    })),
    total,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  });

  if (!userId && sessionId) {
    response.cookies.set("cart-session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
  }

  return response;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const sessionId = !userId ? await getSessionId() : undefined;

  const body = await request.json();
  const { productId, variantId, quantity = 1 } = body;

  if (!productId || !variantId) {
    return NextResponse.json(
      { error: "productId ve variantId gereklidir" },
      { status: 400 }
    );
  }

  // Verify variant exists and has stock
  const variant = await db.variant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant || !variant.active || variant.productId !== productId) {
    return NextResponse.json({ error: "Geçersiz ürün varyantı" }, { status: 400 });
  }

  if (variant.stock < quantity) {
    return NextResponse.json(
      { error: "Yetersiz stok" },
      { status: 400 }
    );
  }

  // Check if item already in cart
  const existingItem = await db.cartItem.findFirst({
    where: {
      ...(userId ? { userId } : { sessionId }),
      productId,
      variantId,
    },
  });

  let cartItem;
  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (newQuantity > variant.stock) {
      return NextResponse.json(
        { error: "Stok miktarını aşamazsınız" },
        { status: 400 }
      );
    }
    cartItem = await db.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity },
    });
  } else {
    cartItem = await db.cartItem.create({
      data: {
        ...(userId ? { userId } : { sessionId }),
        productId,
        variantId,
        quantity,
      },
    });
  }

  const response = NextResponse.json(cartItem, { status: existingItem ? 200 : 201 });

  if (!userId && sessionId) {
    response.cookies.set("cart-session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return response;
}
