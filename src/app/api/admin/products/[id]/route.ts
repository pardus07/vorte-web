import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { logActivity } from "@/lib/audit";

async function checkAdmin() {
  const session = await auth();
  const role = (session?.user as unknown as { role: string } | undefined)?.role;
  return role === "ADMIN";
}

/**
 * Ürün bul: önce ID ile, bulamazsa slug ile dene.
 * AI Agent slug gönderebilir — bu fallback onu yakalar.
 */
async function findProduct(idOrSlug: string) {
  // Önce ID ile dene
  let product = await db.product.findUnique({
    where: { id: idOrSlug },
    include: { category: true, variants: true },
  });
  // Bulamazsa slug ile dene
  if (!product) {
    product = await db.product.findFirst({
      where: { slug: idOrSlug },
      include: { category: true, variants: true },
    });
  }
  return product;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const product = await findProduct(id);

    if (!product) {
      return NextResponse.json(
        { error: `Ürün bulunamadı: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (err) {
    console.error("[products/[id]] GET error:", err);
    return NextResponse.json(
      { error: `Ürün getirme hatası: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idOrSlug } = await params;

    // Ürünü bul (ID veya slug ile)
    const existing = await findProduct(idOrSlug);
    if (!existing) {
      return NextResponse.json(
        { error: `Ürün bulunamadı: ${idOrSlug}. Lütfen önce get_products ile doğru ürün ID'sini alın.` },
        { status: 404 }
      );
    }

    const realId = existing.id; // Gerçek DB ID'si

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
        where: { slug, id: { not: realId } },
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

    if (Object.keys(data).length === 0 && !variants) {
      return NextResponse.json(
        { error: "Güncellenecek alan bulunamadı. En az bir alan gönderin." },
        { status: 400 }
      );
    }

    let product = existing;
    if (Object.keys(data).length > 0) {
      product = await db.product.update({
        where: { id: realId },
        data,
        include: { category: true, variants: true },
      });
    }

    // Varyant güncelleme: sadece variants gönderilmişse
    if (variants !== undefined && variants?.length > 0) {
      await db.variant.deleteMany({ where: { productId: realId } });
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
            productId: realId,
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
      where: { id: realId },
      include: { category: true, variants: true },
    });

    const session = await auth();
    if (session?.user) {
      logActivity(
        (session.user as { id: string }).id,
        "product.update",
        realId,
        undefined,
        req.headers.get("x-forwarded-for") || undefined
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[products/[id]] PUT error:", err);
    return NextResponse.json(
      { error: `Ürün güncelleme hatası: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
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

  const session = await auth();
  if (session?.user) {
    logActivity(
      (session.user as { id: string }).id,
      "product.delete",
      id,
      undefined,
      _req.headers.get("x-forwarded-for") || undefined
    );
  }

  return NextResponse.json({ success: true });
}
