export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { retrievePaymentResult } from "@/lib/iyzico";
import { formatPrice } from "@/lib/utils";
import { resendClient } from "@/lib/integrations/resend";
import { cookies } from "next/headers";

// iyzico 3D Secure sonrası kullanıcı buraya POST ile yönlendirilir
export async function POST(req: NextRequest) {
  let redirectUrl = "/odeme/basarisiz";

  try {
    const formData = await req.formData();
    const token = formData.get("token") as string;

    if (!token) {
      console.error("[iyzico callback] Token missing");
      redirect("/odeme/basarisiz");
    }

    // iyzico'dan ödeme sonucunu sorgula
    const result = await retrievePaymentResult(token);

    if (!result.conversationId) {
      console.error("[iyzico callback] No conversationId in result:", result);
      redirect("/odeme/basarisiz");
    }

    // Payment kaydını bul
    const payment = await db.payment.findFirst({
      where: { iyzicoConversationId: result.conversationId },
      include: {
        order: {
          include: {
            user: { select: { id: true, email: true, name: true } },
            items: { include: { variant: true } },
          },
        },
      },
    });

    if (!payment) {
      console.error("[iyzico callback] Payment not found for conversationId:", result.conversationId);
      redirect("/odeme/basarisiz");
    }

    if (result.status === "success" && result.paymentStatus === "SUCCESS") {
      // Ödeme başarılı
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          iyzicoPaymentId: result.paymentId,
          paidAt: new Date(),
        },
      });

      await db.order.update({
        where: { id: payment.orderId },
        data: { status: "PAID" },
      });

      // Stok düş
      for (const item of payment.order.items) {
        await db.variant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Sepet temizle
      const cookieStore = await cookies();
      const sessionId = cookieStore.get("cart-session")?.value;
      if (payment.order.user?.id) {
        await db.cartItem.deleteMany({ where: { userId: payment.order.user.id } });
      } else if (sessionId) {
        await db.cartItem.deleteMany({ where: { sessionId } });
      }

      // Bildirim oluştur
      await db.notification.create({
        data: {
          type: "PAYMENT_SUCCESS",
          title: "Ödeme Alındı",
          message: `#${payment.order.orderNumber} - ${formatPrice(payment.amount)}`,
          orderId: payment.orderId,
        },
      });

      // E-posta gönder
      if (payment.order.user?.email) {
        try {
          await resendClient.sendPaymentSuccess(
            payment.order.user.email,
            payment.order.orderNumber,
            formatPrice(payment.amount)
          );
        } catch (emailErr) {
          console.error("[iyzico callback] Email error:", emailErr);
        }
      }

      redirectUrl = `/odeme/basarili?order=${payment.orderId}`;
    } else {
      // Ödeme başarısız
      console.error("[iyzico callback] Payment failed:", {
        status: result.status,
        paymentStatus: result.paymentStatus,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      });

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

      redirectUrl = "/odeme/basarisiz";
    }
  } catch (err) {
    console.error("[iyzico callback] Error:", err);
    redirectUrl = "/odeme/basarisiz";
  }

  redirect(redirectUrl);
}
