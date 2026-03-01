import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resendClient } from "@/lib/integrations/resend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trackingNo, status, carrier } = body;

    if (!trackingNo) {
      return NextResponse.json({ error: "Missing tracking number" }, { status: 400 });
    }

    // Find order by tracking number
    const order = await db.order.findFirst({
      where: { cargoTrackingNo: trackingNo },
      include: {
        user: { select: { email: true, name: true } },
        dealer: { select: { email: true, companyName: true } },
      },
    });

    if (!order) {
      console.error("[Geliver webhook] Order not found for tracking:", trackingNo);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Map Geliver status to our order status
    let newStatus: string | null = null;
    if (status === "DELIVERED") {
      newStatus = "DELIVERED";
    } else if (status === "IN_TRANSIT" || status === "OUT_FOR_DELIVERY") {
      newStatus = "SHIPPED";
    }

    if (newStatus && newStatus !== order.status) {
      await db.order.update({
        where: { id: order.id },
        data: { status: newStatus as "SHIPPED" | "DELIVERED" },
      });

      // Send notification email for delivery
      if (newStatus === "DELIVERED") {
        const email = order.user?.email || order.dealer?.email;
        if (email) {
          await resendClient.sendEmail({
            to: email,
            subject: `Siparişiniz Teslim Edildi - #${order.orderNumber}`,
            html: `<p>Siparişiniz başarıyla teslim edildi.</p>`,
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
