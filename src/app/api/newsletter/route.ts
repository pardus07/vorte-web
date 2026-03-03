import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

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

    await getResend().emails.send({
      from: "Vorte E-Bulten <noreply@vorte.com.tr>",
      to: "info@vorte.com.tr",
      subject: "Yeni E-Bulten Aboneligi",
      html: `
        <h2>Yeni E-Bulten Aboneligi</h2>
        <p>Asagidaki e-posta adresi e-bultene abone oldu:</p>
        <p style="font-size:18px;font-weight:bold;"><a href="mailto:${email}">${email}</a></p>
        <p style="color:#666;font-size:12px;">Bu bildirim vorte.com.tr e-bulten formundan otomatik olarak gonderilmistir.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      { error: "Kayit islemi basarisiz. Lutfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
