import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const validateSchema = z.object({
  code: z.string().min(1).max(50).trim().toUpperCase(),
});

// POST — Hediye çeki doğrulama
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Geçersiz hediye çeki kodu.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { code } = parsed.data;

    const card = await db.giftCard.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        balance: true,
        initialAmount: true,
        active: true,
        expiresAt: true,
        senderName: true,
        message: true,
      },
    });

    if (!card) {
      return NextResponse.json(
        { success: false, error: "Hediye çeki bulunamadı.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!card.active) {
      return NextResponse.json(
        { success: false, error: "Bu hediye çeki devre dışı bırakılmış.", code: "INACTIVE" },
        { status: 400 }
      );
    }

    if (card.expiresAt && card.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Bu hediye çekinin süresi dolmuş.", code: "EXPIRED" },
        { status: 400 }
      );
    }

    if (card.balance <= 0) {
      return NextResponse.json(
        { success: false, error: "Bu hediye çekinin bakiyesi kalmamış.", code: "NO_BALANCE" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: card.id,
        code: card.code,
        balance: card.balance,
        initialAmount: card.initialAmount,
        senderName: card.senderName,
        message: card.message,
      },
    });
  } catch (error) {
    console.error("[API:gift-card] Doğrulama hatası:", {
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { success: false, error: "Bir hata oluştu. Lütfen tekrar deneyin.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
