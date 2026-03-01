import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, phone, password } = body;

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
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      passwordHash,
    },
  });

  return NextResponse.json(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    { status: 201 }
  );
}
