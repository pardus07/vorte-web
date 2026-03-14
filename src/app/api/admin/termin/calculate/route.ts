import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { calculateTermin, formatTerminDate, type TerminMode } from "@/lib/production/termin-calculator";
import { z } from "zod";

const terminSchema = z.object({
  totalQuantity: z.number().int().positive(),
  orderDate: z.string().optional(),
  mode: z.enum(["min", "avg", "max"]).optional(),
});

// POST — calculate termin for given quantity
export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const parsed = terminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
  }

  const { totalQuantity, orderDate, mode } = parsed.data;

  const result = calculateTermin(
    totalQuantity,
    orderDate ? new Date(orderDate) : undefined,
    mode as TerminMode | undefined,
  );

  return NextResponse.json({
    mode: result.mode,
    totalBusinessDays: result.totalBusinessDays,
    rawBusinessDays: result.rawBusinessDays,
    estimatedDelivery: result.estimatedDelivery.toISOString(),
    estimatedDeliveryFormatted: formatTerminDate(result.estimatedDelivery),
    orderDate: result.orderDate.toISOString(),
    totalQuantity: result.totalQuantity,
    stages: result.stages,
  });
}
