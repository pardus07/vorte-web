import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Ad, e-posta ve mesaj alanlari zorunludur." },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Gecerli bir e-posta adresi giriniz." },
        { status: 400 }
      );
    }

    await getResend().emails.send({
      from: "Vorte İletisim Formu <noreply@vorte.com.tr>",
      to: "info@vorte.com.tr",
      subject: `Yeni İletisim Mesaji - ${name}`,
      html: `
        <h2>Yeni İletisim Formu Mesaji</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px;">
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Ad Soyad</td>
            <td style="padding:8px;border:1px solid #ddd;">${name}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">E-posta</td>
            <td style="padding:8px;border:1px solid #ddd;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Telefon</td>
            <td style="padding:8px;border:1px solid #ddd;">${phone || "-"}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Mesaj</td>
            <td style="padding:8px;border:1px solid #ddd;">${message.replace(/\n/g, "<br>")}</td>
          </tr>
        </table>
      `,
      replyTo: email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Mesaj gonderilemedi. Lutfen daha sonra tekrar deneyin." },
      { status: 500 }
    );
  }
}
