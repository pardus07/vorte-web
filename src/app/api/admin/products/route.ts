import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { logActivity } from "@/lib/audit";


async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const role = (session.user as unknown as { role: string }).role;
  return role === "ADMIN";
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("category") || "";
  const status = searchParams.get("status") || "";
  const stockStatus = searchParams.get("stock") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { variants: { some: { sku: { contains: search, mode: "insensitive" } } } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (status === "active") where.active = true;
  else if (status === "inactive") where.active = false;

  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: true, variants: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  // Stock filter (post-query since it's an aggregate)
  let filtered = products;
  if (stockStatus === "out_of_stock") {
    filtered = products.filter((p) => p.variants.reduce((s, v) => s + v.stock, 0) === 0);
  } else if (stockStatus === "low") {
    filtered = products.filter((p) => {
      const t = p.variants.reduce((s, v) => s + v.stock, 0);
      return t > 0 && t <= 10;
    });
  } else if (stockStatus === "in_stock") {
    filtered = products.filter((p) => p.variants.reduce((s, v) => s + v.stock, 0) > 0);
  }

  return NextResponse.json({
    products: filtered,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    categories,
  });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await request.json();
  const {
    name, description, categoryId, gender, basePrice, costPrice,
    weight, featured, images, seoTitle, seoDescription, googleCategory, variants,
  } = body;

  if (!name || !categoryId || !gender || basePrice === undefined) {
    return NextResponse.json({ error: "Gerekli alanlar eksik" }, { status: 400 });
  }

  let slug = slugify(name);
  const existing = await db.product.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const product = await db.product.create({
    data: {
      name,
      slug,
      description: description || null,
      categoryId,
      gender,
      basePrice: Number(basePrice),
      costPrice: costPrice ? Number(costPrice) : null,
      weight: weight ? Number(weight) : null,
      featured: featured || false,
      images: images || [],
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      googleCategory: googleCategory || null,
      variants: {
        create: (variants || []).map(
          (v: {
            color: string;
            colorHex: string;
            size: string;
            sku: string;
            gtinBarcode?: string;
            stock: number;
            price?: number | null;
          }) => ({
            color: v.color,
            colorHex: v.colorHex,
            size: v.size,
            sku: v.sku,
            gtinBarcode: v.gtinBarcode || null,
            stock: Number(v.stock),
            price: v.price ? Number(v.price) : null,
          })
        ),
      },
    },
    include: { variants: true },
  });

  const session = await auth();
  if (session?.user) {
    logActivity(
      (session.user as { id: string }).id,
      "product.create",
      product.id,
      product.name,
      request.headers.get("x-forwarded-for") || undefined
    );
  }

  // Sitemap + kategori sayfalarını revalidate et
  try {
    revalidatePath("/sitemap.xml");
    revalidatePath("/erkek-ic-giyim");
    revalidatePath("/kadin-ic-giyim");
  } catch { /* revalidate hatası kritik değil */ }

  return NextResponse.json(product, { status: 201 });
}
