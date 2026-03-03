import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import bcryptjs from "bcryptjs";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("users", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
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
      updatedAt: true,
      _count: { select: { orders: true, favorites: true, addresses: true } },
      orders: {
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(user);
}

const updateUserSchema = z.object({
  name: z.string().min(1, "Ad zorunlu").optional(),
  email: z.string().email("Geçerli e-posta girin").optional(),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").optional().nullable(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER", "CUSTOMER"]).optional(),
  permissions: z.record(z.string(), z.string()).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("users", "w");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veriler", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { password, ...data } = parsed.data;

  // Only ADMIN can change roles
  if (data.role && admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Sadece süper admin rol değiştirebilir" }, { status: 403 });
  }

  // Prevent self-deactivation
  if (id === admin.userId && data.active === false) {
    return NextResponse.json({ error: "Kendi hesabınızı pasif yapamazsınız" }, { status: 400 });
  }

  // Prevent changing own role
  if (id === admin.userId && data.role && data.role !== admin.role) {
    return NextResponse.json({ error: "Kendi rolünüzü değiştiremezsiniz" }, { status: 400 });
  }

  // Check email uniqueness
  if (data.email) {
    const existing = await db.user.findFirst({
      where: { email: data.email, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta adresi zaten kullanılıyor" }, { status: 409 });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = { ...data };
  if (password) {
    updateData.passwordHash = await bcryptjs.hash(password, 12);
  }

  const user = await db.user.update({
    where: { id },
    data: updateData,
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

  return NextResponse.json(user);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("users", "d");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  // Only ADMIN can delete users
  if (admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Sadece süper admin kullanıcı silebilir" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self-deletion
  if (id === admin.userId) {
    return NextResponse.json({ error: "Kendi hesabınızı silemezsiniz" }, { status: 400 });
  }

  await db.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
