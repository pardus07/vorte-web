import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

const createSchema = z.object({
  patternId: z.string().min(1),
  orderId: z.string().optional(),
  fabricWidth: z.number().positive(),
  cuttingMethod: z.string().default("straightKnife"),
  sizeCombo: z.string().min(1),
  placements: z.array(z.any()),
  markerLength: z.number().positive(),
  efficiency: z.number().min(0).max(100),
  totalFabricM2: z.number().positive(),
  totalFabricKg: z.number().positive(),
  layCount: z.number().int().positive().default(1),
  markerRepeats: z.number().int().positive().default(1),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await requirePermission("products", "r");
    if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const patternId = searchParams.get("patternId");
    const orderId = searchParams.get("orderId");

    const where: Record<string, unknown> = {};
    if (patternId) where.patternId = patternId;
    if (orderId) where.orderId = orderId;

    const results = await db.nestingResult.findMany({
      where,
      include: { pattern: { select: { name: true, modelType: true, gender: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ results, total: results.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requirePermission("products", "w");
    if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz veri", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await db.nestingResult.create({
      data: parsed.data,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
