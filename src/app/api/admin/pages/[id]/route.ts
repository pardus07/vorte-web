"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updatePageSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  content: z.string().optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  template: z.enum(["default", "fullwidth", "sidebar"]).optional(),
  published: z.boolean().optional(),
  order: z.number().int().optional(),
  showInMenu: z.boolean().optional(),
  showInFooter: z.boolean().optional(),
});

// GET — single page
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const page = await db.page.findUnique({ where: { id } });
  if (!page) return NextResponse.json({ error: "Sayfa bulunamadı" }, { status: 404 });
  return NextResponse.json(page);
}

// PUT — update page
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updatePageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  // Check slug uniqueness
  if (parsed.data.slug) {
    const existing = await db.page.findFirst({
      where: { slug: parsed.data.slug, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 400 });
    }
  }

  const page = await db.page.update({ where: { id }, data: parsed.data });
  return NextResponse.json(page);
}

// DELETE — delete page
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  await db.page.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
