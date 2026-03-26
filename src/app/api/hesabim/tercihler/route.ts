import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// GET — Bildirim tercihlerini getir
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const prefs = await db.userPreference.findUnique({
    where: { userId: session.user.id },
    select: {
      emailOrders: true,
      emailPromotions: true,
      emailStock: true,
      smsOrders: true,
    },
  });

  // Tercih kaydı yoksa varsayılan değerler
  return NextResponse.json({
    success: true,
    data: prefs || {
      emailOrders: true,
      emailPromotions: true,
      emailStock: true,
      smsOrders: false,
    },
  });
}

const prefsSchema = z.object({
  emailOrders: z.boolean(),
  emailPromotions: z.boolean(),
  emailStock: z.boolean(),
  smsOrders: z.boolean(),
});

// PUT — Bildirim tercihlerini güncelle
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = prefsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Geçersiz veri.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await db.userPreference.upsert({
      where: { userId: session.user.id },
      update: parsed.data,
      create: { userId: session.user.id, ...parsed.data },
    });

    return NextResponse.json({ success: true, message: "Bildirim tercihleriniz güncellendi." });
  } catch (error) {
    console.error("[API:tercihler] Güncelleme hatası:", {
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      { success: false, error: "Bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
