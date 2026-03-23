import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("products", "r")(req);
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
