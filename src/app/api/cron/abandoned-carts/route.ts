import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resendClient } from "@/lib/integrations/resend";

const CRON_SECRET = process.env.CRON_SECRET || "";

// GET — Terk edilmiş sepetlere hatırlatma e-postası gönder
// 1 saatten eski, henüz hatırlatma gönderilmemiş, kurtarılmamış sepetler
export async function GET(req: NextRequest) {
  try {
    // Basit güvenlik kontrolü
    const authHeader = req.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const carts = await db.abandonedCart.findMany({
      where: {
        reminderSent: false,
        recoveredAt: null,
        email: { not: null },
        createdAt: { lt: oneHourAgo },
      },
      select: {
        id: true,
        email: true,
        cartData: true,
      },
      take: 50, // Batch limit
    });

    if (carts.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "Gönderilecek hatırlatma yok." });
    }

    let sentCount = 0;

    for (const cart of carts) {
      if (!cart.email) continue;

      const items = cart.cartData as Array<{ name?: string; quantity?: number; price?: number }>;
      const itemList = items
        .map((i) => `${i.name || "Ürün"} x${i.quantity || 1}`)
        .join(", ");

      try {
        await resendClient.sendEmail({
          to: cart.email,
          subject: "Sepetinizde ürünler bekliyor! — Vorte Tekstil",
          templateName: "abandoned-cart-reminder",
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <img src="https://www.vorte.com.tr/images/logo-dark.jpg" alt="Vorte" width="120" style="margin-bottom:24px;" />
              <h2 style="color:#1A1A1A;margin-bottom:8px;">Sepetinizi unutmayın!</h2>
              <p style="color:#555;line-height:1.6;">
                Sepetinizde bıraktığınız ürünler hâlâ sizi bekliyor: <strong>${itemList}</strong>
              </p>
              <a href="https://www.vorte.com.tr/sepet" style="display:inline-block;background:#7AC143;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;margin-top:16px;font-weight:600;">
                Sepetime Dön
              </a>
              <p style="color:#999;font-size:12px;margin-top:32px;">
                Bu e-postayı almak istemiyorsanız dikkate almayınız.
              </p>
            </div>
          `,
        });

        await db.abandonedCart.update({
          where: { id: cart.id },
          data: { reminderSent: true },
        });

        sentCount++;
      } catch (emailErr) {
        console.error("[CRON:abandoned-carts] E-posta gönderilemedi:", {
          cartId: cart.id,
          error: emailErr instanceof Error ? emailErr.message : emailErr,
        });
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: carts.length,
      message: `${sentCount}/${carts.length} hatırlatma gönderildi.`,
    });
  } catch (error) {
    console.error("[CRON:abandoned-carts] Cron hatası:", {
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { success: false, error: "Cron işlemi sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
