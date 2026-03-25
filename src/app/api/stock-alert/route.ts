import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  variantId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Geçersiz veri", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, variantId } = parsed.data;

    // Variant var mı kontrol
    const variant = await db.variant.findUnique({
      where: { id: variantId },
      select: { id: true, stock: true },
    });

    if (!variant) {
      return NextResponse.json(
        { success: false, error: "Ürün varyantı bulunamadı." },
        { status: 404 }
      );
    }

    if (variant.stock > 0) {
      return NextResponse.json(
        { success: false, error: "Bu ürün zaten stokta mevcut." },
        { status: 400 }
      );
    }

    // Upsert — aynı email+variant zaten varsa güncelle
    await db.stockAlert.upsert({
      where: {
        email_variantId: { email, variantId },
      },
      update: { notified: false },
      create: { email, variantId },
    });

    return NextResponse.json({ success: true, message: "Stok bildirimi kaydedildi." });
  } catch (error) {
    console.error("[API:stock-alert] Hata:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "İşlem sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}
