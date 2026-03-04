import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { generateOrderNumber } from "@/lib/utils";
import { initializeCheckoutForm, getIyzicoConfig } from "@/lib/iyzico";

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

  const shippingCost = subtotal >= 300 ? 0 : 90;
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

  // iyzico config kontrolü — env var veya DB'den
  const iyzicoConfig = await getIyzicoConfig();
  const hasIyzicoKeys = !!iyzicoConfig.apiKey && !!iyzicoConfig.secretKey;

  // Geliştirme ortamı veya iyzico anahtarları yoksa simüle et
  if (process.env.NODE_ENV === "development" && !hasIyzicoKeys) {
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

  // Production: iyzico 3D Secure Checkout Form
  try {
    // Basket items — her item'ın price'ı satır toplamı olmalı
    const basketItems: { id: string; name: string; category1: string; itemType: string; price: string }[] =
      cartItems.map((item) => ({
        id: item.variantId,
        name: item.product.name,
        category1: "İç Giyim",
        itemType: "PHYSICAL",
        price: ((item.variant.price || item.product.basePrice) * item.quantity).toFixed(2),
      }));

    // Kargo ücreti varsa ayrı basketItem olarak ekle
    if (shippingCost > 0) {
      basketItems.push({
        id: "SHIPPING",
        name: "Kargo Ücreti",
        category1: "Kargo",
        itemType: "VIRTUAL",
        price: shippingCost.toFixed(2),
      });
    }

    const nameParts = address.fullName.trim().split(" ");
    const firstName = nameParts[0] || ".";
    const lastName = nameParts.slice(1).join(" ") || ".";

    const paymentData = {
      locale: "tr",
      conversationId: order.payment!.id,
      price: totalAmount.toFixed(2),
      paidPrice: totalAmount.toFixed(2),
      currency: "TRY",
      basketId: order.id,
      paymentGroup: "PRODUCT",
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr"}/api/payment/callback`,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: {
        id: userId || sessionId || "guest",
        name: firstName,
        surname: lastName,
        gsmNumber: address.phone.replace(/\s/g, ""),
        email: session?.user?.email || "misafir@vorte.com.tr",
        identityNumber: "11111111111",
        registrationAddress: address.address,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
        city: address.city,
        country: "Turkey",
      },
      shippingAddress: {
        contactName: address.fullName,
        city: address.city,
        country: "Turkey",
        address: address.address,
      },
      billingAddress: {
        contactName: address.fullName,
        city: address.city,
        country: "Turkey",
        address: address.address,
      },
      basketItems,
    };

    // iyzico conversation ID'sini kaydet
    await db.payment.update({
      where: { id: order.payment!.id },
      data: { iyzicoConversationId: order.payment!.id },
    });

    const iyzicoResult = await initializeCheckoutForm(paymentData);

    if (iyzicoResult.status === "success") {
      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        checkoutFormContent: iyzicoResult.checkoutFormContent,
        paymentPageUrl: iyzicoResult.paymentPageUrl,
        token: iyzicoResult.token,
      });
    } else {
      console.error("[iyzico] Initialize failed:", iyzicoResult);
      await db.payment.update({
        where: { id: order.payment!.id },
        data: { status: "FAILED" },
      });
      await db.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json(
        { error: iyzicoResult.errorMessage || "Ödeme başlatılamadı" },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("[iyzico] Initialize error:", err);
    await db.payment.update({
      where: { id: order.payment!.id },
      data: { status: "FAILED" },
    });
    await db.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json(
      { error: "Ödeme sistemi hatası. Lütfen daha sonra tekrar deneyin." },
      { status: 500 }
    );
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(price);
}
