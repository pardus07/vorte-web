export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { retrievePaymentResult } from "@/lib/iyzico";
import { formatPrice } from "@/lib/utils";
import { resendClient } from "@/lib/integrations/resend";
import { cookies } from "next/headers";

// iyzico 3D Secure sonrası kullanıcı buraya POST ile yönlendirilir
// ÖNEMLİ: redirect() yerine NextResponse.redirect() + 303 kullanılmalı
//   1) redirect() try/catch içinde NEXT_REDIRECT hatası fırlatır → catch yakalar
//   2) POST handler'da redirect() 307 döner → tarayıcı hedef sayfaya POST yapar → çalışmaz
//   3) 303 (See Other) kullanarak tarayıcıya "GET ile yönlen" deriz
export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr";

  try {
    const formData = await req.formData();
    const token = formData.get("token") as string;

    console.log("[iyzico callback] Received callback, token:", token ? token.substring(0, 20) + "..." : "MISSING");

    if (!token) {
      console.error("[iyzico callback] Token missing from form data");
      return NextResponse.redirect(new URL("/odeme/basarisiz", baseUrl), 303);
    }

    // iyzico'dan ödeme sonucunu sorgula
    const result = await retrievePaymentResult(token);

    console.log("[iyzico callback] Retrieve result:", {
      status: result.status,
      paymentStatus: result.paymentStatus,
      paymentId: result.paymentId,
      basketId: result.basketId,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      fraudStatus: result.fraudStatus,
      mdStatus: result.mdStatus,
      token: result.token,
    });

    // iyzico checkout form retrieve yanıtında conversationId YOK
    // basketId = order ID — bunu kullanarak payment'ı buluyoruz
    const orderId = result.basketId;

    if (!orderId) {
      console.error("[iyzico callback] No basketId in result:", JSON.stringify(result).substring(0, 500));
      return NextResponse.redirect(new URL("/odeme/basarisiz", baseUrl), 303);
    }

    // Payment kaydını basketId (= orderId) üzerinden bul
    const payment = await db.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            user: { select: { id: true, email: true, name: true } },
            dealer: { select: { email: true, companyName: true } },
            items: { include: { variant: true } },
          },
        },
      },
    });

    if (!payment) {
      console.error("[iyzico callback] Payment not found for orderId (basketId):", orderId);
      return NextResponse.redirect(new URL("/odeme/basarisiz", baseUrl), 303);
    }

    console.log("[iyzico callback] Found payment:", payment.id, "for order:", payment.order.orderNumber);

    if (result.status === "success" && result.paymentStatus === "SUCCESS") {
      // ===== ÖDEME BAŞARILI =====
      console.log("[iyzico callback] Payment SUCCESS for order:", payment.order.orderNumber);

      // Kritik DB güncellemeleri
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

      // Sepet temizle (non-critical — başarısız olursa ödeme yine başarılı)
      try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get("cart-session")?.value;
        if (payment.order.user?.id) {
          await db.cartItem.deleteMany({ where: { userId: payment.order.user.id } });
        } else if (sessionId) {
          await db.cartItem.deleteMany({ where: { sessionId } });
        }
      } catch (cartErr) {
        console.error("[iyzico callback] Cart clear error (non-critical):", cartErr);
      }

      // Bildirim oluştur (non-critical)
      try {
        await db.notification.create({
          data: {
            type: "PAYMENT_SUCCESS",
            title: "Ödeme Alındı",
            message: `#${payment.order.orderNumber} - ${formatPrice(payment.amount)}`,
            orderId: payment.orderId,
          },
        });
      } catch (notifErr) {
        console.error("[iyzico callback] Notification error (non-critical):", notifErr);
      }

      // E-posta gönder (non-critical)
      const customerEmail = payment.order.user?.email || payment.order.dealer?.email;
      if (customerEmail) {
        try {
          await resendClient.sendPaymentSuccess(
            customerEmail,
            payment.order.orderNumber,
            formatPrice(payment.amount)
          );
          await resendClient.sendOrderConfirmation(
            customerEmail,
            payment.order.orderNumber,
            formatPrice(payment.order.totalAmount)
          );
        } catch (emailErr) {
          console.error("[iyzico callback] Email error (non-critical):", emailErr);
        }
      }

      console.log("[iyzico callback] Redirecting to success page for order:", payment.orderId);
      return NextResponse.redirect(
        new URL(`/odeme/basarili?order=${payment.orderId}`, baseUrl),
        303
      );
    } else {
      // ===== ÖDEME BAŞARISIZ =====
      console.error("[iyzico callback] Payment FAILED:", {
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

      // Bildirim (non-critical)
      try {
        await db.notification.create({
          data: {
            type: "PAYMENT_FAILED",
            title: "Ödeme Başarısız",
            message: `#${payment.order.orderNumber} - Ödeme reddedildi`,
            orderId: payment.orderId,
          },
        });
      } catch (notifErr) {
        console.error("[iyzico callback] Notification error:", notifErr);
      }

      return NextResponse.redirect(new URL("/odeme/basarisiz", baseUrl), 303);
    }
  } catch (err) {
    console.error("[iyzico callback] Unhandled error:", err);
    return NextResponse.redirect(new URL("/odeme/basarisiz", baseUrl), 303);
  }
}
