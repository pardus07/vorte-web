import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import { z } from "zod";

const refundSchema = z.object({
  itemIds: z.array(z.string()).optional(), // Specific items to refund, or all if empty
  reason: z.string().min(1, "İade nedeni zorunlu"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("orders", "w");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = refundSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veriler", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { itemIds, reason } = parsed.data;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          variant: { select: { id: true, stock: true } },
        },
      },
      payment: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }

  if (!["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
    return NextResponse.json({ error: "Bu sipariş iade edilemez" }, { status: 400 });
  }

  // Determine which items to refund
  const refundItems = itemIds && itemIds.length > 0
    ? order.items.filter((item) => itemIds.includes(item.id))
    : order.items;

  if (refundItems.length === 0) {
    return NextResponse.json({ error: "İade edilecek ürün bulunamadı" }, { status: 400 });
  }

  const refundAmount = refundItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const isFullRefund = refundItems.length === order.items.length;

  try {
    // In production, call iyzico refund API here
    // For now, simulate the refund process
    const iyzicoRefundId = `REF-${Date.now()}`;

    if (isFullRefund) {
      // Full refund — update order status
      await db.order.update({
        where: { id },
        data: { status: "REFUNDED" },
      });

      // Update payment status
      if (order.payment) {
        await db.payment.update({
          where: { id: order.payment.id },
          data: { status: "REFUNDED" },
        });
      }
    }

    // Restore stock for refunded items
    for (const item of refundItems) {
      await db.variant.update({
        where: { id: item.variant.id },
        data: { stock: { increment: item.quantity } },
      });
    }

    // Create status history
    await db.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: order.status,
        toStatus: isFullRefund ? "REFUNDED" : order.status,
        note: `İade işlemi: ${refundItems.length} ürün, ${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(refundAmount)} — Neden: ${reason}`,
        changedBy: admin.userId,
      },
    });

    return NextResponse.json({
      success: true,
      refundId: iyzicoRefundId,
      refundAmount,
      isFullRefund,
      itemCount: refundItems.length,
    });
  } catch (error) {
    console.error("[Refund] Error:", error);
    return NextResponse.json({ error: "İade işlemi başarısız" }, { status: 500 });
  }
}
