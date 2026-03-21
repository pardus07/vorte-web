import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { resendClient } from "@/lib/integrations/resend";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

const VALID_STAGES = [
  "PENDING", "BOM_CALCULATED", "MATERIALS_ORDERED", "MATERIALS_RECEIVED",
  "IN_PRODUCTION", "QUALITY_CHECK", "PACKAGING_STAGE", "PROD_SHIPPED",
  "PROD_DELIVERED", "PROD_CANCELLED",
] as const;

// Stage → progress % mapping
const STAGE_PROGRESS: Record<string, number> = {
  PENDING: 0,
  BOM_CALCULATED: 10,
  MATERIALS_ORDERED: 20,
  MATERIALS_RECEIVED: 35,
  IN_PRODUCTION: 50,
  QUALITY_CHECK: 75,
  PACKAGING_STAGE: 85,
  PROD_SHIPPED: 95,
  PROD_DELIVERED: 100,
  PROD_CANCELLED: 0,
};

const statusSchema = z.object({
  stage: z.enum(VALID_STAGES),
  note: z.string().optional(),
  progress: z.number().int().min(0).max(100).optional(),
});

// PATCH — update production order stage
// Writes to BOTH stageHistory (JSON array) AND ProductionTracking table
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
  }

  const { stage: newStage, note, progress } = parsed.data;

  const order = await db.fullProductionOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Üretim siparişi bulunamadı" }, { status: 404 });
  }

  if (order.stage === newStage) {
    return NextResponse.json({ error: "Sipariş zaten bu aşamada" }, { status: 400 });
  }

  // Aşama geçiş kontrolü — sadece bir sonraki/önceki aşamaya veya PROD_CANCELLED'a geçilebilir
  const VALID_TRANSITIONS: Record<string, string[]> = {
    PENDING: ["BOM_CALCULATED", "PROD_CANCELLED"],
    BOM_CALCULATED: ["PENDING", "MATERIALS_ORDERED", "PROD_CANCELLED"],
    MATERIALS_ORDERED: ["BOM_CALCULATED", "MATERIALS_RECEIVED", "PROD_CANCELLED"],
    MATERIALS_RECEIVED: ["MATERIALS_ORDERED", "IN_PRODUCTION", "PROD_CANCELLED"],
    IN_PRODUCTION: ["MATERIALS_RECEIVED", "QUALITY_CHECK", "PROD_CANCELLED"],
    QUALITY_CHECK: ["IN_PRODUCTION", "PACKAGING_STAGE", "PROD_CANCELLED"],
    PACKAGING_STAGE: ["QUALITY_CHECK", "PROD_SHIPPED", "PROD_CANCELLED"],
    PROD_SHIPPED: ["PACKAGING_STAGE", "PROD_DELIVERED", "PROD_CANCELLED"],
    PROD_DELIVERED: ["PROD_SHIPPED"],
    PROD_CANCELLED: ["PENDING"], // İptalden sadece PENDING'e dönülebilir
  };

  const allowedTransitions = VALID_TRANSITIONS[order.stage] || [];
  if (!allowedTransitions.includes(newStage)) {
    return NextResponse.json(
      { error: `Geçersiz aşama geçişi: ${order.stage} → ${newStage}. İzin verilen geçişler: ${allowedTransitions.join(", ")}` },
      { status: 400 },
    );
  }

  const changedBy = admin.name || admin.email;
  const now = new Date();

  // 1. Update stageHistory JSON array — push new entry
  const history = order.stageHistory as Array<Record<string, unknown>>;
  history.push({
    stage: newStage,
    date: now.toISOString(),
    note: note || `${order.stage} → ${newStage}`,
    changedBy,
  });

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    stage: newStage,
    stageHistory: JSON.parse(JSON.stringify(history)),
  };

  // Auto-set actualDelivery when delivered
  if (newStage === "PROD_DELIVERED") {
    updateData.actualDelivery = now;
  }

  // Update order
  const updated = await db.fullProductionOrder.update({
    where: { id },
    data: updateData,
    include: { items: true },
  });

  // 2. Create ProductionTracking entry
  await db.productionTracking.create({
    data: {
      productionOrderId: id,
      stage: newStage,
      progress: progress ?? STAGE_PROGRESS[newStage] ?? 0,
      notes: note || `Durum güncellendi: ${order.stage} → ${newStage}`,
    },
  });

  // 3. Dealer notification — send email + in-app notification if dealerId exists
  if (order.dealerId) {
    notifyDealerStageChange(order.dealerId, order.orderNumber, newStage, order.stage, note).catch((err) =>
      console.error("[DealerNotify] Error:", err)
    );
  }

  return NextResponse.json({
    order: updated,
    stageChange: {
      from: order.stage,
      to: newStage,
      changedBy,
      date: now.toISOString(),
    },
  });
}

// ─── Dealer Stage Change Notification ────────────────────
const STAGE_EMAIL_MAP: Record<string, { subject: string; message: string }> = {
  BOM_CALCULATED: {
    subject: "Üretim siparişiniz onaylandı",
    message: "Üretim siparişiniz onaylandı, malzeme planlaması yapıldı.",
  },
  MATERIALS_ORDERED: {
    subject: "Malzemeler sipariş edildi",
    message: "Malzemeler tedarikçiye sipariş edildi.",
  },
  MATERIALS_RECEIVED: {
    subject: "Malzemeler teslim alındı",
    message: "Malzemeler teslim alındı, üretime hazırlanıyor.",
  },
  IN_PRODUCTION: {
    subject: "Ürünleriniz üretimde",
    message: "Ürünleriniz üretim hattında, imalat devam ediyor.",
  },
  QUALITY_CHECK: {
    subject: "Kalite kontrol aşamasında",
    message: "Ürünleriniz kalite kontrol aşamasına geçti.",
  },
  PACKAGING_STAGE: {
    subject: "Paketleniyor",
    message: "Kalite kontrol geçti, ürünleriniz paketleniyor.",
  },
  PROD_SHIPPED: {
    subject: "Kargoya verildi",
    message: "Siparişiniz kargoya verildi.",
  },
  PROD_DELIVERED: {
    subject: "Teslim edildi",
    message: "Siparişiniz teslim edildi.",
  },
  PROD_CANCELLED: {
    subject: "Üretim iptal edildi",
    message: "Üretim siparişiniz iptal edildi.",
  },
};

async function notifyDealerStageChange(
  dealerId: string,
  orderNumber: string,
  newStage: string,
  _oldStage: string,
  note?: string
) {
  const stageInfo = STAGE_EMAIL_MAP[newStage];
  if (!stageInfo) return;

  const dealer = await db.dealer.findUnique({
    where: { id: dealerId },
    select: { email: true, companyName: true },
  });
  if (!dealer?.email) return;

  // In-app notification
  await createNotification({
    type: "PRODUCTION_TERMIN",
    title: `${stageInfo.subject} — #${orderNumber}`,
    message: `${stageInfo.message}${note ? ` Not: ${note}` : ""}`,
  });

  // Email notification
  const prodNote = note || stageInfo.message;
  await resendClient.sendFromTemplate({
    templateName: "production-termin",
    to: dealer.email,
    variables: {
      companyName: dealer.companyName,
      orderNumber,
      terminDate: stageInfo.subject,
      productionNote: prodNote,
      totalAmount: "",
    },
  });
}
