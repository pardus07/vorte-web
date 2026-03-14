import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resendClient } from "@/lib/integrations/resend";

const CRON_SECRET = process.env.CRON_SECRET || "";

/**
 * GET /api/cron/supplier-orders
 *
 * Gönderilmemiş tedarikçi siparişlerini bulur ve e-posta gönderir.
 * Coolify cron: Pazartesi 09:00 → curl -H "Authorization: Bearer $CRON_SECRET" https://vorte.com.tr/api/cron/supplier-orders
 */
export async function GET(req: NextRequest) {
  // Auth: Bearer token veya query param
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || req.nextUrl.searchParams.get("token");

  if (CRON_SECRET && token !== CRON_SECRET) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    // emailSent=false ve deliveredAt=null olan siparişleri bul
    const pendingOrders = await db.supplierOrder.findMany({
      where: {
        emailSent: false,
        deliveredAt: null,
      },
      include: {
        supplier: { select: { name: true, email: true, contactName: true } },
        productionOrder: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (pendingOrders.length === 0) {
      return NextResponse.json({ message: "Gönderilecek sipariş yok", sent: 0 });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const order of pendingOrders) {
      // Tedarikçi e-posta adresi yoksa atla
      if (!order.supplier.email) {
        errors.push(`${order.id}: Tedarikçi e-posta adresi yok (${order.supplier.name})`);
        continue;
      }

      const materials = (order.materials as Array<{ name: string; quantity: number; unit: string }>) || [];
      const expectedDate = order.expectedDelivery
        ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(order.expectedDelivery)
        : "Belirtilmedi";
      const orderNumber = order.productionOrder?.orderNumber || "-";

      try {
        await resendClient.sendSupplierOrder(
          order.supplier.email,
          order.supplier.contactName || order.supplier.name,
          materials,
          expectedDate,
          orderNumber,
          order.notes || undefined
        );

        // emailSent = true, sentAt = now, emailContent kaydet
        await db.supplierOrder.update({
          where: { id: order.id },
          data: {
            emailSent: true,
            sentAt: new Date(),
            emailContent: `Malzeme siparişi e-postası gönderildi: ${order.supplier.email} — ${materials.map((m) => `${m.quantity} ${m.unit} ${m.name}`).join(", ")}`,
          },
        });

        sent++;
        console.log(`[Cron] Tedarikçi siparişi e-postası gönderildi: ${order.supplier.name} (${order.id})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${order.id}: ${msg}`);
        console.error(`[Cron] E-posta gönderilemedi: ${order.supplier.name}`, err);
      }
    }

    return NextResponse.json({
      message: `${sent}/${pendingOrders.length} e-posta gönderildi`,
      sent,
      total: pendingOrders.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[Cron] supplier-orders hatası:", err);
    return NextResponse.json(
      { error: "İç sunucu hatası", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
