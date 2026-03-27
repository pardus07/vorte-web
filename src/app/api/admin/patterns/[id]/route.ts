import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePermission("products", "r");
    if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    const { id } = await params;

    const pattern = await db.pattern.findUnique({
      where: { id },
      include: { nestingResults: { orderBy: { createdAt: "desc" }, take: 10 } },
    });

    if (!pattern) {
      return NextResponse.json({ error: "Kalıp bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(pattern);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePermission("products", "w");
    if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    const { id } = await params;
    const body = await _req.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.parameters !== undefined) updateData.parameters = body.parameters;
    if (body.pieces !== undefined) updateData.pieces = body.pieces;
    if (body.grading !== undefined) updateData.grading = body.grading;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Versiyon artır
    if (body.parameters || body.pieces) {
      updateData.version = { increment: 1 };
    }

    const pattern = await db.pattern.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(pattern);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePermission("products", "w");
    if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    const { id } = await params;

    await db.pattern.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
