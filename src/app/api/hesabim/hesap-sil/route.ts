import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const deleteSchema = z.object({
  confirmation: z.literal("HESABIMI SIL"),
});

// POST — Hesap silme talebi (KVKK uyumlu)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Silme onayı geçersiz. 'HESABIMI SIL' yazmanız gerekiyor." },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Siparişleri anonim hale getir (KVKK: satış kaydı tutulmalı)
    await db.order.updateMany({
      where: { userId },
      data: { userId: null as unknown as string },
    });

    // İlişkili verileri sil
    await db.userPreference.deleteMany({ where: { userId } });
    await db.loyaltyPoint.deleteMany({ where: { userId } });
    await db.address.deleteMany({ where: { userId } });
    await db.productReview.deleteMany({ where: { userId } });

    // Kullanıcıyı sil (cascade ile kalan ilişkiler de silinir)
    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({
      success: true,
      message: "Hesabınız başarıyla silindi. Kişisel verileriniz KVKK kapsamında kaldırıldı.",
    });
  } catch (error) {
    console.error("[API:hesap-sil] Hesap silme hatası:", {
      error: error instanceof Error ? error.message : error,
      userId: session.user.id,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { success: false, error: "Hesap silme sırasında bir hata oluştu. Lütfen destek ile iletişime geçin." },
      { status: 500 }
    );
  }
}
