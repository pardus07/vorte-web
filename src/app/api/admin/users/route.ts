import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import bcryptjs from "bcryptjs";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const admin = await requirePermission("users", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") || "admin"; // "admin" or "customer"
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = parseInt(sp.get("limit") || "20");
  const search = sp.get("search") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (type === "admin") {
    where.role = { in: ["ADMIN", "EDITOR", "VIEWER"] };
  } else {
    where.role = "CUSTOMER";
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        permissions: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        _count: type === "customer" ? { select: { orders: true } } : undefined,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, limit });
}

const createUserSchema = z.object({
  name: z.string().min(1, "Ad zorunlu"),
  email: z.string().email("Geçerli e-posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
  permissions: z.record(z.string(), z.string()).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const admin = await requirePermission("users", "w");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  // Only ADMIN can create admin users
  if (admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Sadece süper admin kullanıcı oluşturabilir" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veriler", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, password, role, permissions } = parsed.data;

  // Check duplicate email
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Bu e-posta adresi zaten kullanılıyor" }, { status: 409 });
  }

  const passwordHash = await bcryptjs.hash(password, 12);

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      permissions: permissions || undefined,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      permissions: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
