import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import { z } from "zod";

const batchSchema = z.object({
  orderIds: z.array(z.string()).min(1, "En az bir sipariş seçin"),
  action: z.enum(["status_update", "ship", "invoice"]),
  status: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
});

export async function POST(req: NextRequest) {
  const admin = await requirePermission("orders", "w");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = batchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veriler", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { orderIds, action, status } = parsed.data;

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  if (action === "status_update" && status) {
    for (const orderId of orderIds) {
      try {
        const order = await db.order.findUnique({
          where: { id: orderId },
          select: { status: true, orderNumber: true },
        });

        if (!order) {
          errorCount++;
          errors.push(`Sipariş bulunamadı: ${orderId}`);
          continue;
        }

        await db.order.update({
          where: { id: orderId },
          data: { status },
        });

        await db.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: order.status,
            toStatus: status,
            note: "Toplu işlem ile güncellendi",
            changedBy: admin.userId,
          },
        });

        successCount++;
      } catch {
        errorCount++;
        errors.push(`Hata: ${orderId}`);
      }
    }
  }

  return NextResponse.json({
    success: true,
    successCount,
    errorCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}
