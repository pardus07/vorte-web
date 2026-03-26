import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendCallTransferNotification } from "@/lib/firebase-admin";
import { generateLiveKitToken, getLiveKitUrl } from "@/lib/livekit-token";

const transferSchema = z.object({
  roomName: z.string().min(1),
  callerNumber: z.string().min(1),
  summary: z.string().default("Müşteri yetkiliye aktarılmak istiyor"),
  callId: z.string().optional(),
});

/**
 * POST /api/admin/voice-calls/transfer
 * Voice AI'dan çağrı aktarma talebi.
 * FCM push gönderir + LiveKit token üretir.
 */
export async function POST(req: NextRequest) {
  try {
    // Voice AI server API key kontrolü
    const apiKey = req.headers.get("x-server-api-key");
    const serverKey = process.env.VORTE_SERVER_API_KEY;

    if (!serverKey || apiKey !== serverKey) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = transferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz veri", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { roomName, callerNumber, summary, callId } = parsed.data;

    // Aktif device token'ları al
    const deviceTokens = await db.deviceToken.findMany({
      where: { active: true },
      select: { token: true },
    });

    if (deviceTokens.length === 0) {
      console.warn("[Transfer] Kayıtlı cihaz token'ı bulunamadı");
      return NextResponse.json(
        {
          success: false,
          error: "Kayıtlı cihaz bulunamadı. Uygulamayı açın ve tekrar deneyin.",
          code: "NO_DEVICE",
        },
        { status: 404 }
      );
    }

    // LiveKit token oluştur (operatör için)
    const livekitToken = await generateLiveKitToken({
      identity: "operator-ibrahim",
      roomName,
      ttl: 3600, // 1 saat
    });

    const livekitUrl = getLiveKitUrl();

    // FCM push gönder
    const fcmResult = await sendCallTransferNotification({
      deviceTokens: deviceTokens.map((dt) => dt.token),
      roomName,
      callerNumber,
      summary,
      livekitUrl,
      livekitToken,
    });

    console.log(
      `[Transfer] FCM gönderildi: ${fcmResult.sentCount}/${deviceTokens.length} başarılı, room=${roomName}`
    );

    // CallLog'a transferredTo bilgisi ekle
    if (callId) {
      await db.callLog
        .update({
          where: { callId },
          data: { transferredTo: "operator-ibrahim" },
        })
        .catch((err: Error) => {
          console.warn("[Transfer] CallLog güncelleme hatası:", err.message);
        });
    }

    return NextResponse.json({
      success: fcmResult.success,
      sentCount: fcmResult.sentCount,
      livekitUrl,
      livekitToken,
      errors: fcmResult.errors.length > 0 ? fcmResult.errors : undefined,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Transfer] Hata:", msg, error);
    return NextResponse.json(
      { error: "Aktarma işlemi başarısız", detail: msg },
      { status: 500 }
    );
  }
}
