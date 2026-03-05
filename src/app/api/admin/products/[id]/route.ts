import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

async function checkAdmin() {
  const session = await auth();
  const role = (session?.user as unknown as { role: string } | undefined)?.role;
  return role === "ADMIN";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: { category: true, variants: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const {
    name, description, categoryId, gender, basePrice, costPrice,
    weight, active, featured, images, seoTitle, seoDescription,
    googleCategory, variants,
  } = body;

  // Partial update desteği: sadece gönderilen alanları güncelle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};

  if (name !== undefined) {
    let slug = slugify(name);
    const existingSlug = await db.product.findFirst({
      where: { slug, id: { not: id } },
    });
    if (existingSlug) slug = `${slug}-${Date.now()}`;
    data.name = name;
    data.slug = slug;
  }
  if (description !== undefined) data.description = description || null;
  if (categoryId !== undefined) data.categoryId = categoryId;
  if (gender !== undefined) data.gender = gender;
  if (basePrice !== undefined) data.basePrice = Number(basePrice);
  if (costPrice !== undefined) data.costPrice = costPrice ? Number(costPrice) : null;
  if (weight !== undefined) data.weight = weight ? Number(weight) : null;
  if (active !== undefined) data.active = active;
  if (featured !== undefined) data.featured = featured;
  if (images !== undefined) data.images = images;
  if (seoTitle !== undefined) data.seoTitle = seoTitle || null;
  if (seoDescription !== undefined) data.seoDescription = seoDescription || null;
  if (googleCategory !== undefined) data.googleCategory = googleCategory || null;

  const product = await db.product.update({
    where: { id },
    data,
  });

  // Varyant güncelleme: sadece variants gönderilmişse
  if (variants !== undefined && variants?.length > 0) {
    await db.variant.deleteMany({ where: { productId: id } });
    await db.variant.createMany({
      data: variants.map(
        (v: {
          color: string;
          colorHex: string;
          size: string;
          sku: string;
          gtinBarcode: string;
          stock: number;
          price: string;
        }) => ({
          productId: product.id,
          color: v.color,
          colorHex: v.colorHex,
          size: v.size as "S" | "M" | "L" | "XL" | "XXL",
          sku: v.sku,
          gtinBarcode: v.gtinBarcode || null,
          stock: v.stock || 0,
          price: v.price ? parseFloat(v.price) : null,
        })
      ),
    });
  }

  const updated = await db.product.findUnique({
    where: { id },
    include: { category: true, variants: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
