import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resendClient } from "@/lib/integrations/resend";
import { formatPrice } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, conversationId, status, paymentId } = body;

    if (!token || !conversationId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Find the payment by conversation ID
    const payment = await db.payment.findFirst({
      where: { iyzicoConversationId: conversationId },
      include: {
        order: {
          include: {
            user: { select: { email: true, name: true } },
            items: { include: { variant: true } },
          },
        },
      },
    });

    if (!payment) {
      console.error("[iyzico webhook] Payment not found:", conversationId);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (status === "SUCCESS") {
      // Update payment
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          iyzicoPaymentId: paymentId,
          paidAt: new Date(),
        },
      });

      // Update order status
      await db.order.update({
        where: { id: payment.orderId },
        data: { status: "PAID" },
      });

      // Decrease stock
      for (const item of payment.order.items) {
        await db.variant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Create notification
      await db.notification.create({
        data: {
          type: "PAYMENT_SUCCESS",
          title: "Ödeme Alındı",
          message: `#${payment.order.orderNumber} - ${formatPrice(payment.amount)}`,
          orderId: payment.orderId,
        },
      });

      // Send email
      if (payment.order.user?.email) {
        await resendClient.sendPaymentSuccess(
          payment.order.user.email,
          payment.order.orderNumber,
          formatPrice(payment.amount)
        );
      }
    } else {
      // Payment failed
      await db.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });

      await db.order.update({
        where: { id: payment.orderId },
        data: { status: "CANCELLED" },
      });

      await db.notification.create({
        data: {
          type: "PAYMENT_FAILED",
          title: "Ödeme Başarısız",
          message: `#${payment.order.orderNumber} - Ödeme reddedildi`,
          orderId: payment.orderId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[iyzico webhook] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
