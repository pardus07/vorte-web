import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import { z } from "zod";
import { logActivity } from "@/lib/audit";
import { resendClient } from "@/lib/integrations/resend";
import { formatPrice } from "@/lib/utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("orders", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      dealer: { select: { id: true, companyName: true, dealerCode: true, contactName: true, phone: true, email: true, taxNumber: true, taxOffice: true } },
      items: {
        include: {
          product: { select: { name: true, slug: true, images: true } },
          variant: { select: { color: true, size: true, sku: true, stock: true } },
        },
      },
      payment: true,
      invoice: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(order);
}

const updateOrderSchema = z.object({
  status: z.enum(["PENDING", "PAID", "PROCESSING", "PRODUCTION", "PRODUCTION_READY", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).optional(),
  cargoTrackingNo: z.string().nullable().optional(),
  cargoProvider: z.string().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
  statusNote: z.string().optional(),
  productionTermin: z.string().nullable().optional(), // ISO date string
  productionNote: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("orders", "w");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veriler", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { status, statusNote, adminNotes, productionTermin, productionNote, ...rest } = parsed.data;

  // Get current order for status history
  const currentOrder = await db.order.findUnique({
    where: { id },
    select: {
      status: true,
      isProduction: true,
      orderNumber: true,
      totalAmount: true,
      dealerId: true,
    },
    // items needed if transitioning to PRODUCTION_READY
  });

  if (!currentOrder) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = { ...rest };

  if (adminNotes !== undefined) {
    updateData.adminNotes = adminNotes;
  }

  // Üretim termin tarihi
  if (productionTermin !== undefined) {
    updateData.productionTermin = productionTermin ? new Date(productionTermin) : null;
  }
  if (productionNote !== undefined) {
    updateData.productionNote = productionNote;
  }

  if (status && status !== currentOrder.status) {
    updateData.status = status;

    // Create status history entry
    await db.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: currentOrder.status,
        toStatus: status,
        note: statusNote || null,
        changedBy: admin.userId,
      },
    });

    // PRODUCTION_READY'e geçişte stok düş
    if (status === "PRODUCTION_READY" && currentOrder.isProduction) {
      const orderWithItems = await db.order.findUnique({
        where: { id },
        include: { items: { include: { variant: true } } },
      });
      if (orderWithItems) {
        for (const item of orderWithItems.items) {
          await db.variant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }
        console.log("[admin orders] Stock decremented for production order:", currentOrder.orderNumber);
      }
    }
  }

  // Termin girildiğinde bayiye bildirim + email gönder
  if (productionTermin && currentOrder.dealerId) {
    const terminDate = new Date(productionTermin).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Bildirim oluştur
    try {
      await db.notification.create({
        data: {
          type: "PRODUCTION_TERMIN",
          title: "Üretim Termin Bildirimi",
          message: `#${currentOrder.orderNumber} — Tahmini teslim: ${terminDate}`,
          orderId: id,
        },
      });
    } catch {}

    // Bayiye email gönder
    try {
      const dealer = await db.dealer.findUnique({
        where: { id: currentOrder.dealerId },
        select: { email: true, companyName: true },
      });
      if (dealer?.email) {
        await resendClient.sendFromTemplate({
          templateName: "production-termin",
          to: dealer.email,
          variables: {
            companyName: dealer.companyName,
            orderNumber: currentOrder.orderNumber,
            terminDate,
            productionNote: productionNote || updateData.productionNote || "",
            totalAmount: formatPrice(currentOrder.totalAmount),
          },
        });
      }
    } catch (emailErr) {
      console.error("[admin orders] Termin email error:", emailErr);
    }
  }

  const order = await db.order.update({
    where: { id },
    data: updateData,
    include: {
      user: { select: { name: true, email: true } },
      dealer: { select: { companyName: true, email: true } },
      payment: { select: { status: true } },
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  logActivity(
    admin.userId,
    "order.update",
    id,
    status ? `status: ${status}` : undefined,
    req.headers.get("x-forwarded-for") || undefined
  );

  return NextResponse.json(order);
}

// DELETE /api/admin/orders/[id] — Sipariş sil
export async function DELETE(
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
    include: { payment: { select: { status: true } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }

  // Sadece iptal edilmiş veya başarısız ödeme olan siparişler silinebilir
  const canDelete =
    order.status === "CANCELLED" ||
    order.status === "REFUNDED" ||
    (order.status === "PENDING" &&
      (!order.payment ||
        order.payment.status === "PENDING" ||
        order.payment.status === "FAILED"));

  if (!canDelete) {
    return NextResponse.json(
      { error: "Sadece iptal edilmiş, iade edilmiş veya başarısız siparişler silinebilir" },
      { status: 400 }
    );
  }

  try {
    await db.order.delete({ where: { id } });

    logActivity(
      admin.userId,
      "order.delete",
      id,
      undefined,
      _req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin orders] DELETE error:", error);
    return NextResponse.json({ error: "Sipariş silinemedi" }, { status: 500 });
  }
}
