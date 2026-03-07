import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resendClient } from "@/lib/integrations/resend";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput, sanitizeHtml } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`contact:${ip}`, 3, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen 15 dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { name: rawName, email, phone: rawPhone, message: rawMessage } = body;

    // Sanitize user input
    const name = sanitizeInput(rawName);
    const phone = rawPhone ? sanitizeInput(rawPhone) : rawPhone;
    const message = sanitizeInput(sanitizeHtml(rawMessage));

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

    // Save to DB
    await db.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject: `İletişim Formu - ${name}`,
        message,
      },
    });

    await resendClient.sendEmail({
      to: "info@vorte.com.tr",
      subject: `Yeni İletişim Mesajı - ${name}`,
      html: `
        <h2>Yeni İletişim Formu Mesajı</h2>
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
      templateName: "contact-notification",
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
