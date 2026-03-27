import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import type { Prisma } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(1, "Kalıp adı zorunlu"),
  modelType: z.string().min(1),
  gender: z.enum(["male", "female"]),
  baseSize: z.string().default("M"),
  parameters: z.record(z.string(), z.any()),
  pieces: z.array(z.any()),
  grading: z.record(z.string(), z.any()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await requirePermission("products", "r");
    if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

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

    const pattern = await db.pattern.create({
      data: {
        name: parsed.data.name,
        modelType: parsed.data.modelType,
        gender: parsed.data.gender,
        baseSize: parsed.data.baseSize,
        parameters: parsed.data.parameters as Prisma.InputJsonValue,
        pieces: parsed.data.pieces as Prisma.InputJsonValue,
        grading: parsed.data.grading
          ? (parsed.data.grading as Prisma.InputJsonValue)
          : undefined,
      },
    });

    return NextResponse.json(pattern, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
