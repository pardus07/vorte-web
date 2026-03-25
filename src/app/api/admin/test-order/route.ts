import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GEÇİCİ ENDPOINT — Test siparişi oluşturur.
 * Kullanıldıktan sonra silinecek.
 */
export async function POST() {
  const admin = await requirePermission("orders", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  try {
    // Kadın Külot Siyah M varyantını bul
    const variant = await db.variant.findFirst({
      where: {
        color: "Siyah",
        size: "M",
        product: { name: { contains: "Kadın Külot" } },
      },
      include: { product: true },
    });

    if (!variant) {
      return NextResponse.json({ error: "Kadın Külot Siyah M varyantı bulunamadı" }, { status: 404 });
    }

    // Admin kullanıcıyı bul
    const adminUser = await db.user.findFirst({ where: { role: "ADMIN" } });
    if (!adminUser) {
      return NextResponse.json({ error: "Admin kullanıcı bulunamadı" }, { status: 404 });
    }

    const unitPrice = variant.price || variant.product.basePrice;
    const quantity = 3;
    const totalAmount = unitPrice * quantity;

    // Sipariş numarası oluştur
    const now = new Date();
    const orderNumber = `VRT-${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Date.now().toString().slice(-4)}`;

    const order = await db.order.create({
      data: {
        orderNumber,
        userId: adminUser.id,
        type: "RETAIL",
        status: "PAID",
        totalAmount,
        shippingCost: 0,
        discountAmount: 0,
        addressSnapshot: {
          fullName: "Test Sipariş",
          phone: "05001234567",
          city: "Bursa",
          district: "Nilüfer",
          address: "Test adres",
        },
        items: {
          create: {
            productId: variant.productId,
            variantId: variant.id,
            quantity,
            unitPrice,
            totalPrice: totalAmount,
            productSnapshot: {
              name: variant.product.name,
              color: variant.color,
              size: variant.size,
              sku: variant.sku,
            },
          },
        },
      },
      include: { items: true },
    });

    return NextResponse.json({
      success: true,
      message: `Test siparişi oluşturuldu: ${order.orderNumber}`,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        product: variant.product.name,
        variant: `${variant.color} ${variant.size}`,
        quantity,
      },
    });
  } catch (error) {
    console.error("Test order error:", error);
    return NextResponse.json(
      { error: "Sipariş oluşturulamadı", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
