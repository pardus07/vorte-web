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
  const { name, description, categoryId, gender, basePrice, active, featured, variants } = body;

  const product = await db.product.update({
    where: { id },
    data: {
      name,
      slug: slugify(name),
      description,
      categoryId,
      gender,
      basePrice,
      active,
      featured,
    },
  });

  // Delete old variants and recreate
  await db.variant.deleteMany({ where: { productId: id } });
  if (variants?.length > 0) {
    await db.variant.createMany({
      data: variants.map((v: { color: string; colorHex: string; size: string; sku: string; gtinBarcode: string; stock: number; price: string }) => ({
        productId: product.id,
        color: v.color,
        colorHex: v.colorHex,
        size: v.size as "S" | "M" | "L" | "XL" | "XXL",
        sku: v.sku,
        gtinBarcode: v.gtinBarcode || null,
        stock: v.stock || 0,
        price: v.price ? parseFloat(v.price) : null,
      })),
    });
  }

  return NextResponse.json(product);
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
