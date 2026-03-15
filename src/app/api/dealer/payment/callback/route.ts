export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { retrievePaymentResult } from "@/lib/iyzico";
import { formatPrice } from "@/lib/utils";
import { resendClient } from "@/lib/integrations/resend";
import { calculateBOM, type BOMInput } from "@/lib/production/bom-calculator";
import { calculateTermin } from "@/lib/production/termin-calculator";

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

        // ─── Otomatik FullProductionOrder + BOM + Tedarikçi Siparişleri ───
        try {
          // Ürün+renk bazında grupla
          const grouped: Record<string, {
            productId: string; sku: string; productName: string; color: string;
            sizeS: number; sizeM: number; sizeL: number; sizeXL: number; sizeXXL: number;
          }> = {};

          for (const item of payment.order.items) {
            const variant = item.variant;
            const key = `${item.productId}-${variant?.color || "default"}`;
            if (!grouped[key]) {
              const baseSku = variant?.sku?.replace(/-[SMLX]+$/i, "") || item.productId.slice(0, 6);
              grouped[key] = {
                productId: item.productId, sku: baseSku,
                productName: (item as any).product?.name || (item as any).productSnapshot?.name || "Ürün",
                color: variant?.color || "Standart",
                sizeS: 0, sizeM: 0, sizeL: 0, sizeXL: 0, sizeXXL: 0,
              };
            }
            const size = variant?.size?.toUpperCase() || "";
            if (size === "S") grouped[key].sizeS += item.quantity;
            else if (size === "M") grouped[key].sizeM += item.quantity;
            else if (size === "L") grouped[key].sizeL += item.quantity;
            else if (size === "XL") grouped[key].sizeXL += item.quantity;
            else if (size === "XXL") grouped[key].sizeXXL += item.quantity;
            else grouped[key].sizeM += item.quantity;
          }

          const prodItems = Object.values(grouped);
          const totalQuantity = prodItems.reduce((sum, i) => sum + i.sizeS + i.sizeM + i.sizeL + i.sizeXL + i.sizeXXL, 0);

          // PO numarası
          const year = new Date().getFullYear();
          const lastPO = await db.fullProductionOrder.findFirst({
            where: { orderNumber: { startsWith: `PO-${year}` } },
            orderBy: { orderNumber: "desc" },
          });
          const nextNum = lastPO ? parseInt(lastPO.orderNumber.split("-")[2]) + 1 : 1;
          const poNumber = `PO-${year}-${String(nextNum).padStart(3, "0")}`;

          // Termin
          const termin = calculateTermin(totalQuantity);

          // FullProductionOrder oluştur
          const stageHistory = [
            { stage: "PENDING", date: new Date().toISOString(), note: "Bayi siparişi otomatik üretime alındı", changedBy: "Sistem" },
          ];

          const prodOrder = await db.fullProductionOrder.create({
            data: {
              orderNumber: poNumber,
              dealerOrderId: payment.orderId,
              dealerId: payment.order.dealer?.id || undefined,
              priority: "normal",
              notes: `Sipariş #${payment.order.orderNumber} — ${payment.order.dealer?.companyName || "Bayi"}`,
              estimatedDelivery: termin.estimatedDelivery,
              stageHistory: JSON.parse(JSON.stringify(stageHistory)),
              items: {
                create: prodItems.map((item) => ({
                  productId: item.productId, sku: item.sku,
                  productName: item.productName, color: item.color,
                  sizeS: item.sizeS, sizeM: item.sizeM, sizeL: item.sizeL,
                  sizeXL: item.sizeXL, sizeXXL: item.sizeXXL,
                  totalQuantity: item.sizeS + item.sizeM + item.sizeL + item.sizeXL + item.sizeXXL,
                })),
              },
            },
          });

          // BOM hesapla
          const bomInputs: BOMInput[] = prodItems.map((item) => ({
            sku: item.sku, productName: item.productName, color: item.color,
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

          stageHistory.push({
            stage: "BOM_CALCULATED", date: new Date().toISOString(),
            note: `BOM otomatik hesaplandı — ${bomResult.summary.totalFabricKg} kg kumaş`, changedBy: "Sistem",
          });

          // Tedarikçi siparişleri + anlık mail
          const materialTypeMap: Record<string, { type: string; quantity: number; unit: string; name: string }> = {};
          if (bomResult.summary.totalFabricKg > 0) materialTypeMap.FABRIC = { type: "FABRIC", quantity: bomResult.summary.totalFabricKg, unit: "kg", name: "Ana Kumaş" };
          if (bomResult.summary.totalLiningKg > 0) materialTypeMap.FABRIC_LINING = { type: "FABRIC", quantity: bomResult.summary.totalLiningKg, unit: "kg", name: "Astar Kumaş" };
          if (bomResult.summary.totalElasticM > 0) materialTypeMap.ELASTIC = { type: "ELASTIC", quantity: bomResult.summary.totalElasticM, unit: "m", name: "Lastik" };
          if (bomResult.summary.totalThreadM > 0) materialTypeMap.THREAD = { type: "THREAD", quantity: bomResult.summary.totalThreadM, unit: "m", name: "İplik" };
          if (bomResult.summary.totalLabels > 0) materialTypeMap.LABEL = { type: "LABEL", quantity: bomResult.summary.totalLabels, unit: "adet", name: "Etiket" };
          if (bomResult.summary.totalPackaging > 0) materialTypeMap.PACKAGING_MAT = { type: "PACKAGING_MAT", quantity: bomResult.summary.totalPackaging, unit: "adet", name: "Ambalaj" };

          const supplierTypes = [...new Set(Object.values(materialTypeMap).map(m => m.type))];
          const suppliers = await db.supplier.findMany({
            where: { type: { in: supplierTypes as any[] }, isActive: true },
          });

          const expectedDelivery = new Date();
          expectedDelivery.setDate(expectedDelivery.getDate() + 7);
          let supplierOrderCount = 0;

          for (const [key, mat] of Object.entries(materialTypeMap)) {
            const supplier = suppliers.find(s => s.type === mat.type);
            if (!supplier) continue;

            const materials = [{ name: mat.name, quantity: mat.quantity, unit: mat.unit }];
            const supplierOrder = await db.supplierOrder.create({
              data: {
                productionOrderId: prodOrder.id, supplierId: supplier.id,
                materials: JSON.parse(JSON.stringify(materials)),
                totalAmount: `${mat.quantity} ${mat.unit} ${mat.name}`,
                expectedDelivery, notes: `PO ${poNumber} için otomatik oluşturuldu`,
                emailSent: false,
              },
            });

            if (supplier.email) {
              try {
                const expectedDateStr = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(expectedDelivery);
                await resendClient.sendSupplierOrder(supplier.email, supplier.contactName || supplier.name, materials, expectedDateStr, poNumber);
                await db.supplierOrder.update({
                  where: { id: supplierOrder.id },
                  data: { emailSent: true, sentAt: new Date(), emailContent: `Mail gönderildi: ${supplier.email}` },
                });
                console.log(`[dealer-callback] Tedarikçi maili gönderildi: ${supplier.name}`);
              } catch (emailErr) {
                console.error(`[dealer-callback] Tedarikçi mail hatası:`, emailErr);
              }
            }
            supplierOrderCount++;
          }

          // Stage güncelle
          if (supplierOrderCount > 0) {
            stageHistory.push({
              stage: "MATERIALS_ORDERED", date: new Date().toISOString(),
              note: `${supplierOrderCount} tedarikçiye malzeme siparişi gönderildi`, changedBy: "Sistem",
            });
            await db.fullProductionOrder.update({
              where: { id: prodOrder.id },
              data: { stage: "MATERIALS_ORDERED", stageHistory: JSON.parse(JSON.stringify(stageHistory)) },
            });
          } else {
            await db.fullProductionOrder.update({
              where: { id: prodOrder.id },
              data: { stage: "BOM_CALCULATED", stageHistory: JSON.parse(JSON.stringify(stageHistory)) },
            });
          }

          console.log(`[dealer-callback] Auto FullProductionOrder ${poNumber} created for ${payment.order.orderNumber}`);
        } catch (prodErr) {
          console.error("[dealer-callback] Auto production order error:", prodErr);
        }
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
