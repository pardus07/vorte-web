import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import { z } from "zod";
import { logActivity } from "@/lib/audit";
import { resendClient } from "@/lib/integrations/resend";
import { formatPrice } from "@/lib/utils";
import { calculateBOM, type BOMInput } from "@/lib/production/bom-calculator";
import { calculateTermin } from "@/lib/production/termin-calculator";

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

    // PRODUCTION'a geçişte otomatik FullProductionOrder oluştur
    if (status === "PRODUCTION" && currentOrder.isProduction) {
      try {
        // Mevcut üretim siparişi var mı kontrol et
        const existingPO = await db.fullProductionOrder.findFirst({
          where: { dealerOrderId: id },
        });

        if (!existingPO) {
          const orderWithItems = await db.order.findUnique({
            where: { id },
            include: {
              items: {
                include: {
                  product: { select: { name: true } },
                  variant: { select: { color: true, size: true, sku: true } },
                },
              },
            },
          });

          if (orderWithItems && orderWithItems.items.length > 0) {
            // Ürün+renk bazında grupla (bedenler ayrı satır olarak geliyor)
            const grouped: Record<string, {
              productId: string; sku: string; productName: string; color: string;
              sizeS: number; sizeM: number; sizeL: number; sizeXL: number; sizeXXL: number;
            }> = {};

            for (const item of orderWithItems.items) {
              const key = `${item.productId}-${item.variant?.color || "default"}`;
              if (!grouped[key]) {
                const baseSku = item.variant?.sku?.replace(/-[SMLX]+$/i, "") || item.productId.slice(0, 6);
                grouped[key] = {
                  productId: item.productId,
                  sku: baseSku,
                  productName: item.product?.name || "Ürün",
                  color: item.variant?.color || "Standart",
                  sizeS: 0, sizeM: 0, sizeL: 0, sizeXL: 0, sizeXXL: 0,
                };
              }
              const size = item.variant?.size?.toUpperCase() || "";
              if (size === "S") grouped[key].sizeS += item.quantity;
              else if (size === "M") grouped[key].sizeM += item.quantity;
              else if (size === "L") grouped[key].sizeL += item.quantity;
              else if (size === "XL") grouped[key].sizeXL += item.quantity;
              else if (size === "XXL") grouped[key].sizeXXL += item.quantity;
              else grouped[key].sizeM += item.quantity; // fallback
            }

            const prodItems = Object.values(grouped);
            const totalQuantity = prodItems.reduce(
              (sum, i) => sum + i.sizeS + i.sizeM + i.sizeL + i.sizeXL + i.sizeXXL, 0
            );

            // Sipariş numarası oluştur
            const year = new Date().getFullYear();
            const lastPO = await db.fullProductionOrder.findFirst({
              where: { orderNumber: { startsWith: `PO-${year}` } },
              orderBy: { orderNumber: "desc" },
            });
            const nextNum = lastPO ? parseInt(lastPO.orderNumber.split("-")[2]) + 1 : 1;
            const poNumber = `PO-${year}-${String(nextNum).padStart(3, "0")}`;

            // Termin hesapla
            const termin = calculateTermin(totalQuantity);

            // FullProductionOrder oluştur
            const prodOrder = await db.fullProductionOrder.create({
              data: {
                orderNumber: poNumber,
                dealerOrderId: id,
                dealerId: currentOrder.dealerId || undefined,
                priority: "normal",
                notes: `Sipariş #${currentOrder.orderNumber} için otomatik oluşturuldu`,
                estimatedDelivery: termin.estimatedDelivery,
                stageHistory: JSON.parse(JSON.stringify([
                  { stage: "PENDING", date: new Date().toISOString(), note: "Sipariş üretime alındı", changedBy: admin.name || admin.email },
                ])),
                items: {
                  create: prodItems.map((item) => ({
                    productId: item.productId,
                    sku: item.sku,
                    productName: item.productName,
                    color: item.color,
                    sizeS: item.sizeS,
                    sizeM: item.sizeM,
                    sizeL: item.sizeL,
                    sizeXL: item.sizeXL,
                    sizeXXL: item.sizeXXL,
                    totalQuantity: item.sizeS + item.sizeM + item.sizeL + item.sizeXL + item.sizeXXL,
                  })),
                },
              },
            });

            // BOM otomatik hesapla
            const bomInputs: BOMInput[] = prodItems.map((item) => ({
              sku: item.sku,
              productName: item.productName,
              color: item.color,
              sizeS: item.sizeS, sizeM: item.sizeM, sizeL: item.sizeL,
              sizeXL: item.sizeXL, sizeXXL: item.sizeXXL,
            }));
            const bomResult = calculateBOM(bomInputs);

            await db.bOMCalculation.create({
              data: {
                productionOrderId: prodOrder.id,
                materials: JSON.parse(JSON.stringify(bomResult.materials)),
                totalFabricKg: bomResult.summary.totalFabricKg,
                totalLiningKg: bomResult.summary.totalLiningKg,
                totalElasticM: bomResult.summary.totalElasticM,
                totalThreadM: bomResult.summary.totalThreadM,
                totalLabels: bomResult.summary.totalLabels,
                totalPackaging: bomResult.summary.totalPackaging,
              },
            });

            // Stage → BOM_CALCULATED
            const newHistory = [
              { stage: "PENDING", date: new Date().toISOString(), note: "Sipariş üretime alındı", changedBy: admin.name || admin.email },
              { stage: "BOM_CALCULATED", date: new Date().toISOString(), note: `BOM otomatik hesaplandı — ${bomResult.summary.totalFabricKg} kg kumaş`, changedBy: "Sistem" },
            ];

            await db.fullProductionOrder.update({
              where: { id: prodOrder.id },
              data: { stage: "BOM_CALCULATED", stageHistory: JSON.parse(JSON.stringify(newHistory)) },
            });

            // Tracking kaydı
            await db.productionTracking.create({
              data: {
                productionOrderId: prodOrder.id,
                stage: "BOM_CALCULATED",
                progress: 10,
                notes: `Sipariş #${currentOrder.orderNumber} → otomatik BOM hesaplandı`,
              },
            });

            console.log(`[admin orders] Auto-created FullProductionOrder ${poNumber} for order ${currentOrder.orderNumber}`);
          }
        }
      } catch (prodErr) {
        console.error("[admin orders] Auto production order error:", prodErr);
        // Hata üretim siparişi oluşturmayı engellemez, ana sipariş güncellenir
      }
    }

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
