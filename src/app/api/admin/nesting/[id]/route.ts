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

    const result = await db.nestingResult.findUnique({
      where: { id },
      include: { pattern: true },
    });

    if (!result) {
      return NextResponse.json({ error: "Nesting sonucu bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(result);
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

    await db.nestingResult.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
