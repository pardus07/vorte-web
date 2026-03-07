import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token ve şifre gereklidir" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Şifre en az 6 karakter olmalıdır" },
        { status: 400 }
      );
    }

    // Verify JWT token
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "secret"
    );

    let payload;
    try {
      const result = await jwtVerify(token, secret);
      payload = result.payload;
    } catch {
      return NextResponse.json(
        { error: "Geçersiz veya süresi dolmuş bağlantı" },
        { status: 400 }
      );
    }

    // Check purpose claim
    if (payload.purpose !== "password-reset" || !payload.userId) {
      return NextResponse.json({ error: "Geçersiz token" }, { status: 400 });
    }

    // Check user exists
    const user = await db.user.findUnique({
      where: { id: payload.userId as string },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ResetPassword] Error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
