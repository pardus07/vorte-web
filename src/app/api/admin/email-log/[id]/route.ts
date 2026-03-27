import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePermission("products", "r");
    if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    const { id } = await params;

    const log = await db.emailLog.findUnique({
      where: { id },
    });

    if (!log) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(log);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
