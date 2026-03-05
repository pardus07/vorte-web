"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const updateBlogSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  excerpt: z.string().optional().nullable(),
  content: z.string().optional(),
  coverImage: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  published: z.boolean().optional(),
  publishedAt: z.string().optional().nullable(),
  authorName: z.string().optional(),
  tags: z.string().optional().nullable(),
});

// GET — single blog post
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const post = await db.blogPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Yazı bulunamadı" }, { status: 404 });
  return NextResponse.json(post);
}

// PUT — update blog post
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateBlogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  if (parsed.data.slug) {
    const existing = await db.blogPost.findFirst({
      where: { slug: parsed.data.slug, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 400 });
    }
  }

  const { publishedAt, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (publishedAt !== undefined) {
    updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
  }
  // Auto-set publishedAt when publishing
  if (rest.published === true) {
    const current = await db.blogPost.findUnique({ where: { id }, select: { publishedAt: true } });
    if (!current?.publishedAt && !publishedAt) {
      updateData.publishedAt = new Date();
    }
  }

  const post = await db.blogPost.update({ where: { id }, data: updateData });

  // Cache temizle — anasayfa blog bölümü + blog listesi + yazı sayfası
  revalidatePath("/");
  revalidatePath("/blog");
  if (post.slug) revalidatePath(`/blog/${post.slug}`);

  return NextResponse.json(post);
}

// DELETE — delete blog post
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const post = await db.blogPost.findUnique({ where: { id }, select: { slug: true } });
  await db.blogPost.delete({ where: { id } });

  // Cache temizle
  revalidatePath("/");
  revalidatePath("/blog");
  if (post?.slug) revalidatePath(`/blog/${post.slug}`);

  return NextResponse.json({ success: true });
}
