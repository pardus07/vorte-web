import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { geliverClient } from "@/lib/integrations/geliver";
import { resendClient } from "@/lib/integrations/resend";

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as unknown as { role: string } | undefined)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await req.json();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { name: true } } } },
      user: { select: { email: true, name: true } },
      dealer: { select: { email: true, companyName: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const address = order.addressSnapshot as {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    zipCode?: string;
  };

  try {
    const shipment = await geliverClient.createShipment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      sender: {
        fullName: "Vorte Tekstil",
        phone: "+90 224 000 0000",
        address: "Nilüfer, Bursa",
        city: "Bursa",
        district: "Nilüfer",
      },
      receiver: address,
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
      })),
    });

    // Update order with tracking info
    await db.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
        cargoTrackingNo: shipment.trackingNo,
        cargoProvider: shipment.carrier,
      },
    });

    // Send email notification
    const email = order.user?.email || order.dealer?.email;
    if (email) {
      await resendClient.sendShippingNotification(
        email,
        order.orderNumber,
        shipment.trackingNo,
        shipment.carrier
      );
    }

    return NextResponse.json(shipment);
  } catch (error) {
    console.error("[Shipping] Error:", error);
    return NextResponse.json({ error: "Shipment creation failed" }, { status: 500 });
  }
}
