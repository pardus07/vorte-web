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
      items: { include: { product: { select: { name: true, weight: true } } } },
      user: { select: { email: true, name: true } },
      dealer: { select: { email: true, companyName: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }

  if (order.cargoTrackingNo) {
    return NextResponse.json({ error: "Bu sipariş için zaten kargo oluşturulmuş" }, { status: 400 });
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
        phone: "+905376220694",
        address: "Dumlupınar Mah., Kayabaşı Sok., 17BG",
        city: "Bursa",
        district: "Nilüfer",
      },
      receiver: address,
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        weight: item.product.weight || undefined,
      })),
      totalAmount: order.totalAmount,
    });

    // Update order with tracking info
    await db.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
        cargoTrackingNo: shipment.trackingNo,
        cargoProvider: shipment.carrier,
        cargoShipmentId: shipment.shipmentId,
      },
    });

    // Create status history
    await db.orderStatusHistory.create({
      data: {
        orderId: orderId,
        fromStatus: order.status,
        toStatus: "SHIPPED",
        note: `Kargo oluşturuldu: ${shipment.carrier} - ${shipment.trackingNo}`,
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

    return NextResponse.json({
      success: true,
      trackingNo: shipment.trackingNo,
      carrier: shipment.carrier,
      shipmentId: shipment.shipmentId,
      labelUrl: shipment.labelUrl,
    });
  } catch (error) {
    console.error("[Shipping] Error:", error);
    return NextResponse.json({ error: "Kargo oluşturulamadı" }, { status: 500 });
  }
}
