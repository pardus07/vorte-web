import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { db } from "@/lib/db";
import { resendClient } from "@/lib/integrations/resend";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen 15 dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { name: rawName, email, phone: rawPhone, password } = body;

  // Sanitize user input
  const name = sanitizeInput(rawName);
  const phone = rawPhone ? sanitizeInput(rawPhone) : rawPhone;

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Ad, e-posta ve şifre gereklidir" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Şifre en az 6 karakter olmalıdır" },
      { status: 400 }
    );
  }

  // Check if email exists
  const existingUser = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "Bu e-posta adresi ile kayıtlı bir hesap var" },
      { status: 409 }
    );
  }

  const passwordHash = await bcryptjs.hash(password, 12);

  const user = await db.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      passwordHash,
    },
  });

  // Welcome email (non-critical)
  try {
    await resendClient.sendWelcome(user.email, user.name || "");
  } catch (emailErr) {
    console.error("[Register] Welcome email error:", emailErr);
  }

  return NextResponse.json(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    { status: 201 }
  );
}
