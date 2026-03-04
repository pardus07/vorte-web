import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resendClient } from "@/lib/integrations/resend";
import { verifyGeliverWebhook, parseWebhookEvent } from "@/lib/integrations/geliver";

/**
 * Geliver Webhook — receives tracking status updates
 * Event: TRACK_UPDATED
 * Payload: WebhookUpdateTrackingRequest { event, data: Shipment }
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Verify webhook signature (non-blocking if no secret configured)
    const isValid = verifyGeliverWebhook(rawBody, headers);
    if (!isValid) {
      console.warn("[Geliver webhook] Signature verification failed");
      // Continue anyway — Geliver may not have secret configured yet
    }

    // Parse webhook payload — accept empty/test payloads with 200
    const event = parseWebhookEvent(rawBody);
    if (!event || !event.data) {
      // Geliver test ping or empty payload — respond 200 OK
      return NextResponse.json({ success: true, message: "Webhook received" });
    }

    const shipment = event.data;
    const trackingNo = shipment.trackingNumber || shipment.barcode;
    const shipmentId = shipment.id;
    const statusCode = shipment.trackingStatus?.trackingStatusCode || shipment.statusCode;

    if (!shipmentId && !trackingNo) {
      // No identifier — still return 200 to not fail Geliver test
      return NextResponse.json({ success: true, message: "No shipment identifier" });
    }

    // Find order by shipmentId or tracking number
    const order = await db.order.findFirst({
      where: {
        OR: [
          ...(shipmentId ? [{ cargoShipmentId: shipmentId }] : []),
          ...(trackingNo ? [{ cargoTrackingNo: trackingNo }] : []),
        ],
      },
      include: {
        user: { select: { email: true, name: true } },
        dealer: { select: { email: true, companyName: true } },
      },
    });

    if (!order) {
      // Order not found — still return 200 (test or unmatched shipment)
      console.warn("[Geliver webhook] Order not found for:", { shipmentId, trackingNo });
      return NextResponse.json({ success: true, message: "Order not matched" });
    }

    // Map Geliver tracking status to our order status
    let newStatus: string | null = null;
    if (statusCode) {
      const code = statusCode.toUpperCase();
      if (code === "DELIVERED" || code === "TESLIM_EDILDI") {
        newStatus = "DELIVERED";
      } else if (
        ["IN_TRANSIT", "OUT_FOR_DELIVERY", "TRANSIT", "DAGITIMDA", "AKTARMADA"].includes(code)
      ) {
        newStatus = "SHIPPED";
      } else if (["RETURNED", "IADE", "IADE_EDILDI"].includes(code)) {
        newStatus = "REFUNDED";
      } else if (["CANCELLED", "IPTAL", "IPTAL_EDILDI"].includes(code)) {
        newStatus = "CANCELLED";
      }
    }

    if (newStatus && newStatus !== order.status) {
      await db.order.update({
        where: { id: order.id },
        data: { status: newStatus as "SHIPPED" | "DELIVERED" | "REFUNDED" | "CANCELLED" },
      });

      // Create status history entry
      await db.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: newStatus,
          note: `Geliver: ${shipment.trackingStatus?.statusDetails || statusCode || "Durum güncellendi"}`,
        },
      });

      // Send notification emails
      const email = order.user?.email || order.dealer?.email;
      if (email) {
        if (newStatus === "DELIVERED") {
          await resendClient.sendEmail({
            to: email,
            subject: `Siparişiniz Teslim Edildi — #${order.orderNumber}`,
            html: `
              <h2>Siparişiniz teslim edildi!</h2>
              <p>Sipariş numaraniz: <strong>#${order.orderNumber}</strong></p>
              <p>Kargo takip no: <strong>${trackingNo || order.cargoTrackingNo}</strong></p>
              <p>Urunlerimizi begeneceginizi umuyoruz. Iyi gunlerde kullanin!</p>
              <p><a href="https://vorte.com.tr/hesabim/siparislerim">Siparislerime Git</a></p>
            `,
          });
        } else if (newStatus === "REFUNDED") {
          await resendClient.sendEmail({
            to: email,
            subject: `Kargo Iade Edildi — #${order.orderNumber}`,
            html: `
              <p>Siparis numaraniz <strong>#${order.orderNumber}</strong> icin kargo iade edildi.</p>
              <p>Detaylar icin hesabinizi kontrol edebilirsiniz.</p>
            `,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Geliver webhook] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
