import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { generateOrderNumber } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("cart-session")?.value;

  if (!userId && !sessionId) {
    return NextResponse.json({ error: "Sepet bulunamadı" }, { status: 400 });
  }

  const body = await request.json();
  const { address } = body;

  if (!address?.fullName || !address?.phone || !address?.city || !address?.address) {
    return NextResponse.json({ error: "Adres bilgileri eksik" }, { status: 400 });
  }

  // Get cart items
  const cartItems = await db.cartItem.findMany({
    where: userId ? { userId } : { sessionId },
    include: {
      product: true,
      variant: true,
    },
  });

  if (cartItems.length === 0) {
    return NextResponse.json({ error: "Sepet boş" }, { status: 400 });
  }

  // Calculate total
  let subtotal = 0;
  const orderItems = cartItems.map((item) => {
    const unitPrice = item.variant.price || item.product.basePrice;
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    return {
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      productSnapshot: {
        name: item.product.name,
        slug: item.product.slug,
        image: item.product.images[0],
        color: item.variant.color,
        size: item.variant.size,
        sku: item.variant.sku,
      },
    };
  });

  const shippingCost = subtotal >= 200 ? 0 : 29.9;
  const totalAmount = subtotal + shippingCost;

  // Verify stock
  for (const item of cartItems) {
    if (item.variant.stock < item.quantity) {
      return NextResponse.json(
        {
          error: `${item.product.name} (${item.variant.color}/${item.variant.size}) için yeterli stok yok`,
        },
        { status: 400 }
      );
    }
  }

  // Create order
  const order = await db.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: userId || null,
      type: "RETAIL",
      status: "PENDING",
      totalAmount,
      shippingCost,
      addressSnapshot: address,
      items: {
        create: orderItems,
      },
      payment: {
        create: {
          status: "PENDING",
          amount: totalAmount,
        },
      },
    },
    include: { payment: true },
  });

  // In development/sandbox mode, simulate payment success
  if (process.env.NODE_ENV === "development" || !process.env.IYZICO_API_KEY) {
    // Update payment and order status
    await db.payment.update({
      where: { id: order.payment!.id },
      data: { status: "SUCCESS", paidAt: new Date() },
    });

    await db.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });

    // Decrement stock
    for (const item of cartItems) {
      await db.variant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Clear cart
    await db.cartItem.deleteMany({
      where: userId ? { userId } : { sessionId },
    });

    // Create notification
    await db.notification.create({
      data: {
        type: "NEW_ORDER",
        title: "Yeni Sipariş",
        message: `#${order.orderNumber} - ${formatPrice(totalAmount)}`,
        orderId: order.id,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  }

  // TODO: Initialize iyzico payment for production
  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.orderNumber,
  });
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(price);
}
