import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resendClient } from "@/lib/integrations/resend";
import { SignJWT } from "jose";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`forgot-pw:${ip}`, 3, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen 15 dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: "E-posta gereklidir" }, { status: 400 });
  }

  // Check if user exists (but always return success to prevent email enumeration)
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (user) {
    try {
      const secret = new TextEncoder().encode(
        process.env.NEXTAUTH_SECRET || "secret"
      );
      const token = await new SignJWT({
        userId: user.id,
        purpose: "password-reset",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(secret);

      const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr"}/sifre-sifirla?token=${token}`;

      await resendClient.sendPasswordReset(user.email, resetUrl);
    } catch (emailErr) {
      console.error("[ForgotPassword] Email error:", emailErr);
    }
  }

  // Always return success to prevent email enumeration
  return NextResponse.json({ success: true });
}
