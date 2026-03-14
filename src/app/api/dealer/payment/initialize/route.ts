import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";
import { generateOrderNumber } from "@/lib/utils";
import { initializeCheckoutForm, getIyzicoConfig } from "@/lib/iyzico";

export async function POST(request: NextRequest) {
  const session = await getDealerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dealer = await db.dealer.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      companyName: true,
      status: true,
      minOrderAmount: true,
      minOrderQuantity: true,
      contactName: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      district: true,
      taxNumber: true,
      taxOffice: true,
    },
  });

  if (!dealer) {
    return NextResponse.json({ error: "Bayi bulunamadı" }, { status: 404 });
  }
  if (dealer.status !== "ACTIVE") {
    return NextResponse.json({ error: "Bayi hesabınız aktif değil." }, { status: 403 });
  }

  // Fetch cart items with dealer pricing
  const cartItems = await db.cartItem.findMany({
    where: { dealerId: dealer.id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          images: true,
          dealerPrices: {
            where: { OR: [{ dealerId: dealer.id }, { dealerId: null }] },
          },
        },
      },
      variant: {
        select: { id: true, color: true, size: true, sku: true, stock: true },
      },
    },
  });

  if (cartItems.length === 0) {
    return NextResponse.json({ error: "Sepet boş" }, { status: 400 });
  }

  // Calculate prices with dealer-specific pricing
  const orderItems = cartItems.map((item) => {
    const dealerPrice = item.product.dealerPrices.find((p) => p.dealerId !== null);
    const generalPrice = item.product.dealerPrices.find((p) => p.dealerId === null);
    const unitPrice = dealerPrice?.wholesalePrice || generalPrice?.wholesalePrice || item.product.basePrice;
    return {
      productId: item.product.id,
      variantId: item.variant.id,
      quantity: item.quantity,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
      productSnapshot: {
        name: item.product.name,
        slug: item.product.slug,
        image: (item.product.images as string[])[0] || null,
        color: item.variant.color,
        size: item.variant.size,
        sku: item.variant.sku,
      },
    };
  });

  const cartTotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const totalQuantity = orderItems.reduce((sum, i) => sum + i.quantity, 0);

  // Minimum order validations
  if (dealer.minOrderAmount && cartTotal < dealer.minOrderAmount) {
    return NextResponse.json(
      { error: `Minimum sipariş tutarı ${dealer.minOrderAmount.toFixed(2)} TL'dir.` },
      { status: 400 }
    );
  }
  if (dealer.minOrderQuantity && totalQuantity < dealer.minOrderQuantity) {
    return NextResponse.json(
      { error: `Minimum sipariş adedi ${dealer.minOrderQuantity}'dir.` },
      { status: 400 }
    );
  }

  // Address snapshot from dealer info
  const addressSnapshot = {
    fullName: dealer.contactName,
    companyName: dealer.companyName,
    phone: dealer.phone,
    email: dealer.email,
    city: dealer.city,
    district: dealer.district,
    address: dealer.address,
    taxNumber: dealer.taxNumber,
    taxOffice: dealer.taxOffice,
  };

  // Create order + payment — status PENDING, stok düşülmez
  const order = await db.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      dealerId: dealer.id,
      type: "WHOLESALE",
      status: "PENDING",
      totalAmount: cartTotal,
      shippingCost: 0,
      addressSnapshot,
      items: { create: orderItems },
      payment: {
        create: { status: "PENDING", amount: cartTotal },
      },
    },
    include: { payment: true },
  });

  // iyzico config check
  const iyzicoConfig = await getIyzicoConfig();
  const hasIyzicoKeys = !!iyzicoConfig.apiKey && !!iyzicoConfig.secretKey;

  // Dev mode without keys — simulate payment
  if (process.env.NODE_ENV === "development" && !hasIyzicoKeys) {
    await db.payment.update({
      where: { id: order.payment!.id },
      data: { status: "SUCCESS", paidAt: new Date() },
    });
    await db.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });
    // Stok düş
    for (const item of cartItems) {
      await db.variant.update({
        where: { id: item.variant.id },
        data: { stock: { decrement: item.quantity } },
      });
    }
    // Sepet temizle
    await db.cartItem.deleteMany({ where: { dealerId: dealer.id } });
    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber });
  }

  // Production/Sandbox: iyzico 3D Secure
  try {
    const basketItems = cartItems.map((item) => {
      const dealerPrice = item.product.dealerPrices.find((p) => p.dealerId !== null);
      const generalPrice = item.product.dealerPrices.find((p) => p.dealerId === null);
      const unitPrice = dealerPrice?.wholesalePrice || generalPrice?.wholesalePrice || item.product.basePrice;
      return {
        id: item.variant.id,
        name: item.product.name,
        category1: "İç Giyim",
        itemType: "PHYSICAL" as const,
        price: (unitPrice * item.quantity).toFixed(2),
      };
    });

    const nameParts = dealer.contactName.trim().split(" ");
    const firstName = nameParts[0] || ".";
    const lastName = nameParts.slice(1).join(" ") || ".";

    const paymentData = {
      locale: "tr",
      conversationId: order.payment!.id,
      price: cartTotal.toFixed(2),
      paidPrice: cartTotal.toFixed(2),
      currency: "TRY",
      basketId: order.id,
      paymentGroup: "PRODUCT",
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr"}/api/dealer/payment/callback`,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: {
        id: dealer.id,
        name: firstName,
        surname: lastName,
        gsmNumber: dealer.phone.replace(/\s/g, ""),
        email: dealer.email,
        identityNumber: dealer.taxNumber || "11111111111",
        registrationAddress: dealer.address,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
        city: dealer.city,
        country: "Turkey",
      },
      shippingAddress: {
        contactName: dealer.contactName,
        city: dealer.city,
        country: "Turkey",
        address: dealer.address,
      },
      billingAddress: {
        contactName: dealer.contactName,
        city: dealer.city,
        country: "Turkey",
        address: dealer.address,
      },
      basketItems,
    };

    // Save iyzico conversation ID
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
      console.error("[dealer-iyzico] Initialize failed:", iyzicoResult);
      await db.payment.update({ where: { id: order.payment!.id }, data: { status: "FAILED" } });
      await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
      return NextResponse.json(
        { error: iyzicoResult.errorMessage || "Ödeme başlatılamadı" },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("[dealer-iyzico] Initialize error:", err);
    await db.payment.update({ where: { id: order.payment!.id }, data: { status: "FAILED" } });
    await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    return NextResponse.json(
      { error: "Ödeme sistemi hatası. Lütfen daha sonra tekrar deneyin." },
      { status: 500 }
    );
  }
}
