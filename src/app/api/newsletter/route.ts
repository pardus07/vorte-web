import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resendClient } from "@/lib/integrations/resend";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`newsletter:${ip}`, 3, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen 15 dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "E-posta adresi zorunludur." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Gecerli bir e-posta adresi giriniz." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Upsert: create or re-activate existing subscriber
    await db.newsletterSubscriber.upsert({
      where: { email: normalizedEmail },
      create: { email: normalizedEmail, active: true },
      update: { active: true },
    });

    // Notify admin
    await resendClient.sendEmail({
      to: "info@vorte.com.tr",
      subject: "Yeni E-Bülten Aboneliği",
      html: `
        <h2>Yeni E-Bülten Aboneliği</h2>
        <p>Aşağıdaki e-posta adresi e-bültene abone oldu:</p>
        <p style="font-size:18px;font-weight:bold;"><a href="mailto:${normalizedEmail}">${normalizedEmail}</a></p>
        <p style="color:#666;font-size:12px;">Bu bildirim vorte.com.tr e-bülten formundan otomatik olarak gönderilmiştir.</p>
      `,
      templateName: "newsletter",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      { error: "Kayıt işlemi başarısız. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
