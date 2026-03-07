import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { db } from "@/lib/db";
import { createDealerToken } from "@/lib/dealer-session";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`dealer-login:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen 15 dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { dealerCode, password } = body;

  if (!dealerCode || !password) {
    return NextResponse.json(
      { error: "Bayi kodu ve şifre gereklidir" },
      { status: 400 }
    );
  }

  const dealer = await db.dealer.findUnique({
    where: { dealerCode: dealerCode.toUpperCase() },
  });

  if (!dealer) {
    return NextResponse.json(
      { error: "Geçersiz bayi kodu veya şifre" },
      { status: 401 }
    );
  }

  if (dealer.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Bayilik hesabınız aktif değil. Lütfen yönetici ile iletişime geçin." },
      { status: 403 }
    );
  }

  const isPasswordValid = await bcryptjs.compare(password, dealer.passwordHash);

  if (!isPasswordValid) {
    return NextResponse.json(
      { error: "Geçersiz bayi kodu veya şifre" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    success: true,
    dealer: {
      id: dealer.id,
      companyName: dealer.companyName,
      dealerCode: dealer.dealerCode,
    },
  });

  const token = createDealerToken({
    id: dealer.id,
    companyName: dealer.companyName,
    dealerCode: dealer.dealerCode,
    email: dealer.email,
    status: dealer.status,
  });

  response.cookies.set("dealer-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
