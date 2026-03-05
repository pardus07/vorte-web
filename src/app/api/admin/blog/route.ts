"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/utils";

const blogSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional().nullable(),
  excerpt: z.string().optional().nullable(),
  content: z.string(),
  coverImage: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  published: z.boolean().default(false),
  publishedAt: z.string().optional().nullable(),
  authorName: z.string().default("Vorte Tekstil"),
  tags: z.string().optional().nullable(),
});

// GET — list blog posts
export async function GET(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search");
  const status = searchParams.get("status"); // "published" | "draft"
  const publishedParam = searchParams.get("published"); // "true" | "false" (AI agent uyumu)

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { tags: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status === "published" || publishedParam === "true") where.published = true;
  if (status === "draft" || publishedParam === "false") where.published = false;

  const [posts, total] = await Promise.all([
    db.blogPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.blogPost.count({ where }),
  ]);

  return NextResponse.json({ posts, total });
}

// POST — create blog post
export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const parsed = blogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
  }

  // Slug yoksa title'dan otomatik oluştur
  let slug = parsed.data.slug?.trim();
  if (!slug) {
    slug = slugify(parsed.data.title);
  }

  // Slug benzersizliğini kontrol et, varsa sonuna sayı ekle
  let finalSlug = slug;
  let counter = 1;
  while (await db.blogPost.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  const { publishedAt, slug: _slug, ...rest } = parsed.data;
  const post = await db.blogPost.create({
    data: {
      ...rest,
      slug: finalSlug,
      publishedAt: publishedAt ? new Date(publishedAt) : rest.published ? new Date() : null,
    },
  });

  // Cache temizle — anasayfa blog bölümü + blog listesi + yeni yazı sayfası
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${finalSlug}`);

  return NextResponse.json(post, { status: 201 });
}
