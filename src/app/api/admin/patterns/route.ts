import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

const createSchema = z.object({
  name: z.string().min(1, "Kalıp adı zorunlu"),
  modelType: z.string().min(1),
  gender: z.enum(["male", "female"]),
  baseSize: z.string().default("M"),
  parameters: z.record(z.any()),
  pieces: z.array(z.any()),
  grading: z.record(z.any()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requirePermission("products", "r")(req);

    const { searchParams } = new URL(req.url);
    const gender = searchParams.get("gender");
    const modelType = searchParams.get("modelType");
    const active = searchParams.get("active");

    const where: Record<string, unknown> = {};
    if (gender) where.gender = gender;
    if (modelType) where.modelType = modelType;
    if (active === "true") where.isActive = true;

    const patterns = await db.pattern.findMany({
      where,
      include: { _count: { select: { nestingResults: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ patterns, total: patterns.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    if (message.includes("Yetkisiz") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("products", "w")(req);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz veri", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const pattern = await db.pattern.create({
      data: {
        name: parsed.data.name,
        modelType: parsed.data.modelType,
        gender: parsed.data.gender,
        baseSize: parsed.data.baseSize,
        parameters: parsed.data.parameters,
        pieces: parsed.data.pieces,
        grading: parsed.data.grading || undefined,
      },
    });

    return NextResponse.json(pattern, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    if (message.includes("Yetkisiz") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
