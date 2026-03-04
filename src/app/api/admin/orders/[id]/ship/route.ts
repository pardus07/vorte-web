import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import { geliverClient } from "@/lib/integrations/geliver";
import { resendClient } from "@/lib/integrations/resend";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("orders", "w");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
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

  if (!["PAID", "PROCESSING"].includes(order.status)) {
    return NextResponse.json({ error: "Sipariş durumu kargo oluşturmaya uygun değil" }, { status: 400 });
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
        phone: "+90 537 622 0694",
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
    });

    // Update order
    await db.order.update({
      where: { id },
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
        orderId: id,
        fromStatus: order.status,
        toStatus: "SHIPPED",
        note: `Kargo oluşturuldu: ${shipment.carrier} - ${shipment.trackingNo}`,
        changedBy: admin.userId,
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
    console.error("[Ship] Error:", error);
    return NextResponse.json({ error: "Kargo oluşturulamadı" }, { status: 500 });
  }
}
