import { NextResponse } from "next/server";

// DEVRE DIŞI: Bayi siparişleri artık /api/dealer/payment/initialize üzerinden
// iyzico ödeme ile oluşturuluyor. Ödeme yapılmadan sipariş oluşturulmaz.
export async function POST() {
  return NextResponse.json(
    {
      error: "Bu endpoint devre dışı bırakılmıştır. Siparişler artık ödeme sistemi üzerinden oluşturulur.",
      redirect: "/bayi/sepet",
    },
    { status: 410 }
  );
}

/* ESKI KOD — Referans için saklanıyor
import { NextRequest } from "next/server";
import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";
import { generateOrderNumber } from "@/lib/utils";

async function POST_LEGACY(req: NextRequest) {
  const session = await getDealerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch full dealer record for minimum order constraints
  const dealer = await db.dealer.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      companyName: true,
      status: true,
      minOrderAmount: true,
      minOrderQuantity: true,
      address: true,
      city: true,
      district: true,
      contactName: true,
      phone: true,
      email: true,
      taxNumber: true,
      taxOffice: true,
    },
  });

  if (!dealer) {
    return NextResponse.json({ error: "Bayi bulunamadı" }, { status: 404 });
  }

  if (dealer.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Bayi hesabınız aktif değil. Lütfen yönetici ile iletişime geçin." },
      { status: 403 }
    );
  }

  // Fetch cart items with product and variant details
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
            where: {
              OR: [{ dealerId: dealer.id }, { dealerId: null }],
            },
          },
        },
      },
      variant: {
        select: {
          id: true,
          color: true,
          colorHex: true,
          size: true,
          sku: true,
          stock: true,
          price: true,
        },
      },
    },
  });

  if (cartItems.length === 0) {
    return NextResponse.json({ error: "Sepet boş" }, { status: 400 });
  }

  // Calculate prices using dealer-specific pricing
  const orderItems = cartItems.map((item) => {
    const dealerPrice = item.product.dealerPrices.find((p) => p.dealerId !== null);
    const generalPrice = item.product.dealerPrices.find((p) => p.dealerId === null);
    const unitPrice =
      dealerPrice?.wholesalePrice ||
      generalPrice?.wholesalePrice ||
      item.product.basePrice;
    const totalPrice = unitPrice * item.quantity;

    return {
      productId: item.product.id,
      variantId: item.variant.id,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
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

  const cartTotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  // --- Minimum order amount validation ---
  if (dealer.minOrderAmount && cartTotal < dealer.minOrderAmount) {
    const remaining = dealer.minOrderAmount - cartTotal;
    return NextResponse.json(
      {
        error: `Minimum sipariş tutarı ${dealer.minOrderAmount.toFixed(2)} TL'dir. Sepet tutarınız: ${cartTotal.toFixed(2)} TL. ${remaining.toFixed(2)} TL daha ürün eklemeniz gerekmektedir.`,
        code: "MIN_ORDER_AMOUNT",
        minOrderAmount: dealer.minOrderAmount,
        cartTotal,
      },
      { status: 400 }
    );
  }

  // --- Minimum order quantity validation ---
  if (dealer.minOrderQuantity && totalQuantity < dealer.minOrderQuantity) {
    const remaining = dealer.minOrderQuantity - totalQuantity;
    return NextResponse.json(
      {
        error: `Minimum sipariş adedi ${dealer.minOrderQuantity}'dir. Sepetinizdeki toplam adet: ${totalQuantity}. ${remaining} adet daha ürün eklemeniz gerekmektedir.`,
        code: "MIN_ORDER_QUANTITY",
        minOrderQuantity: dealer.minOrderQuantity,
        totalQuantity,
      },
      { status: 400 }
    );
  }

  // --- Stock verification ---
  for (const item of cartItems) {
    if (item.variant.stock < item.quantity) {
      return NextResponse.json(
        {
          error: `${item.product.name} (${item.variant.color}/${item.variant.size}) için yeterli stok yok. Mevcut stok: ${item.variant.stock}`,
        },
        { status: 400 }
      );
    }
  }

  // Build address snapshot from dealer info
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

  // Parse optional notes from request body
  let notes: string | undefined;
  try {
    const body = await req.json();
    notes = body.notes;
  } catch {
    // No body or invalid JSON — that's fine
  }

  // Create order in a transaction
  const order = await db.$transaction(async (tx) => {
    // Create the order
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        dealerId: dealer.id,
        type: "WHOLESALE",
        status: "PENDING",
        totalAmount: cartTotal,
        shippingCost: 0, // Dealer orders typically have no shipping cost
        addressSnapshot,
        notes: notes || null,
        items: {
          create: orderItems,
        },
      },
    });

    // Decrement stock for each variant
    for (const item of cartItems) {
      await tx.variant.update({
        where: { id: item.variant.id },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Clear dealer's cart
    await tx.cartItem.deleteMany({
      where: { dealerId: dealer.id },
    });

    return newOrder;
  });

  // Create admin notification
  try {
    await db.notification.create({
      data: {
        type: "NEW_ORDER",
        title: "Yeni Bayi Siparişi",
        message: `${dealer.companyName} — #${order.orderNumber} — ${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(cartTotal)}`,
        orderId: order.id,
      },
    });
  } catch {
    // Non-critical, don't fail the order
  }

  return NextResponse.json({
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalAmount: cartTotal,
  });
}
*/
