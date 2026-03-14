export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { retrievePaymentResult } from "@/lib/iyzico";
import { formatPrice } from "@/lib/utils";
import { resendClient } from "@/lib/integrations/resend";

// iyzico 3D Secure sonrası bayi buraya POST ile yönlendirilir
export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr";

  try {
    const formData = await req.formData();
    const token = formData.get("token") as string;

    console.log("[dealer-iyzico callback] Token:", token ? token.substring(0, 20) + "..." : "MISSING");

    if (!token) {
      return NextResponse.redirect(new URL("/bayi/odeme/basarisiz", baseUrl), 303);
    }

    const result = await retrievePaymentResult(token);

    console.log("[dealer-iyzico callback] Result:", {
      status: result.status,
      paymentStatus: result.paymentStatus,
      paymentId: result.paymentId,
      basketId: result.basketId,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    });

    const orderId = result.basketId;
    if (!orderId) {
      console.error("[dealer-iyzico callback] No basketId in result");
      return NextResponse.redirect(new URL("/bayi/odeme/basarisiz", baseUrl), 303);
    }

    const payment = await db.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            dealer: { select: { id: true, email: true, companyName: true } },
            items: { include: { variant: true } },
          },
        },
      },
    });

    if (!payment) {
      console.error("[dealer-iyzico callback] Payment not found for orderId:", orderId);
      return NextResponse.redirect(new URL("/bayi/odeme/basarisiz", baseUrl), 303);
    }

    if (result.status === "success" && result.paymentStatus === "SUCCESS") {
      // ===== ÖDEME BAŞARILI =====
      console.log("[dealer-iyzico callback] SUCCESS for order:", payment.order.orderNumber);

      // Payment güncelle
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          iyzicoPaymentId: result.paymentId,
          paidAt: new Date(),
        },
      });

      // Üretim kontrolü: herhangi bir kalemde stok yetersizse → tüm sipariş üretim
      const isProduction = payment.order.items.some(
        (item) => item.quantity > item.variant.stock
      );

      if (isProduction) {
        // ÜRETİM SİPARİŞİ — stok düşülMEZ
        console.log("[dealer-iyzico callback] PRODUCTION ORDER for:", payment.order.orderNumber);
        await db.order.update({
          where: { id: payment.orderId },
          data: { status: "PRODUCTION", isProduction: true },
        });
      } else {
        // STOKTAN SİPARİŞ — stok düşülür, hazırlanıyor durumuna geç
        console.log("[dealer-iyzico callback] STOCK ORDER for:", payment.order.orderNumber);
        await db.order.update({
          where: { id: payment.orderId },
          data: { status: "PROCESSING", isProduction: false },
        });

        // Stok düş — sadece stoktan siparişlerde
        for (const item of payment.order.items) {
          await db.variant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      // Sepet temizle
      try {
        if (payment.order.dealer?.id) {
          await db.cartItem.deleteMany({ where: { dealerId: payment.order.dealer.id } });
        }
      } catch (cartErr) {
        console.error("[dealer-iyzico callback] Cart clear error:", cartErr);
      }

      // Admin bildirim
      try {
        await db.notification.create({
          data: {
            type: "PAYMENT_SUCCESS",
            title: isProduction ? "Bayi Üretim Siparişi" : "Bayi Ödeme Alındı",
            message: `${payment.order.dealer?.companyName} — #${payment.order.orderNumber} — ${formatPrice(payment.amount)}${isProduction ? " (ÜRETİM)" : ""}`,
            orderId: payment.orderId,
          },
        });
      } catch (notifErr) {
        console.error("[dealer-iyzico callback] Notification error:", notifErr);
      }

      // Bayiye sipariş onay maili
      const dealerEmail = payment.order.dealer?.email;
      if (dealerEmail) {
        try {
          await resendClient.sendOrderConfirmation(
            dealerEmail,
            payment.order.orderNumber,
            formatPrice(payment.order.totalAmount)
          );
        } catch (emailErr) {
          console.error("[dealer-iyzico callback] Email error:", emailErr);
        }
      }

      return NextResponse.redirect(
        new URL(`/bayi/odeme/basarili?order=${payment.orderId}`, baseUrl),
        303
      );
    } else {
      // ===== ÖDEME BAŞARISIZ =====
      console.error("[dealer-iyzico callback] FAILED:", {
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

      try {
        await db.notification.create({
          data: {
            type: "PAYMENT_FAILED",
            title: "Bayi Ödeme Başarısız",
            message: `${payment.order.dealer?.companyName} — #${payment.order.orderNumber} — Ödeme reddedildi`,
            orderId: payment.orderId,
          },
        });
      } catch {}

      return NextResponse.redirect(new URL("/bayi/odeme/basarisiz", baseUrl), 303);
    }
  } catch (err) {
    console.error("[dealer-iyzico callback] Unhandled error:", err);
    return NextResponse.redirect(new URL("/bayi/odeme/basarisiz", baseUrl), 303);
  }
}
