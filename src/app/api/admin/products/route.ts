import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import slugify from "slugify";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const role = (session.user as unknown as { role: string }).role;
  return role === "ADMIN";
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, categoryId, gender, basePrice, featured, variants } = body;

  if (!name || !categoryId || !gender || basePrice === undefined) {
    return NextResponse.json({ error: "Gerekli alanlar eksik" }, { status: 400 });
  }

  const slug = slugify(name, { lower: true, strict: true, locale: "tr" });

  // Check slug uniqueness
  const existing = await db.product.findUnique({ where: { slug } });
  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

  const product = await db.product.create({
    data: {
      name,
      slug: finalSlug,
      description: description || null,
      categoryId,
      gender,
      basePrice: Number(basePrice),
      featured: featured || false,
      variants: {
        create: (variants || []).map((v: { color: string; colorHex: string; size: string; sku: string; gtinBarcode?: string; stock: number; price?: number | null }) => ({
          color: v.color,
          colorHex: v.colorHex,
          size: v.size,
          sku: v.sku,
          gtinBarcode: v.gtinBarcode || null,
          stock: Number(v.stock),
          price: v.price ? Number(v.price) : null,
        })),
      },
    },
    include: { variants: true },
  });

  return NextResponse.json(product, { status: 201 });
}
