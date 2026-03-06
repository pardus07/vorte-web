import { NextRequest, NextResponse } from "next/server";
import { resendClient } from "@/lib/integrations/resend";

export async function POST(request: NextRequest) {
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

    await resendClient.sendEmail({
      to: "info@vorte.com.tr",
      subject: "Yeni E-Bülten Aboneliği",
      html: `
        <h2>Yeni E-Bülten Aboneliği</h2>
        <p>Aşağıdaki e-posta adresi e-bültene abone oldu:</p>
        <p style="font-size:18px;font-weight:bold;"><a href="mailto:${email}">${email}</a></p>
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
