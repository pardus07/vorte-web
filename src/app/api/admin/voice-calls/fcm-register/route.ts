import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const registerSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["android", "ios", "web"]).default("android"),
});

/**
 * POST /api/admin/voice-calls/fcm-register
 * Android app'ten FCM device token kaydı.
 * x-server-api-key ile auth yapılır.
 */
export async function POST(req: NextRequest) {
  try {
    // Server API key kontrolü
    const apiKey = req.headers.get("x-server-api-key");
    const serverKey = process.env.VORTE_SERVER_API_KEY;

    if (!serverKey || apiKey !== serverKey) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz veri", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token, platform } = parsed.data;

    // Upsert: aynı token varsa güncelle, yoksa oluştur
    await db.deviceToken.upsert({
      where: { token },
      update: {
        active: true,
        platform,
        updatedAt: new Date(),
      },
      create: {
        token,
        platform,
        active: true,
      },
    });

    console.log(
      `[FCM Register] Token kaydedildi: ${token.substring(0, 20)}... (${platform})`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FCM Register] Hata:", error);
    return NextResponse.json(
      { error: "Token kayıt hatası" },
      { status: 500 }
    );
  }
}
