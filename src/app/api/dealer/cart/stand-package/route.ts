import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";
import { getStandPackage } from "@/lib/stand-packages";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const dealer = await getDealerSession();
  if (!dealer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { packageId } = await req.json();
  const pkg = getStandPackage(packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Geçersiz paket" }, { status: 400 });
  }

  // Her stand instance için benzersiz ID
  const standInstanceId = `stand-${pkg.id}-${randomBytes(6).toString("hex")}`;

  // Paket içeriğindeki ürün ve varyantları DB'den çek
  const productSlugs = pkg.items.map((item) => item.productSlug);
  const products = await db.product.findMany({
    where: { slug: { in: productSlugs }, active: true },
    include: {
      variants: { where: { active: true } },
    },
  });

  const cartItemsToCreate: {
    dealerId: string;
    productId: string;
    variantId: string;
    quantity: number;
    standPackageId: string;
    standPackageType: string;
  }[] = [];

  const errors: string[] = [];

  for (const pkgItem of pkg.items) {
    const product = products.find((p) => p.slug === pkgItem.productSlug);
    if (!product) {
      errors.push(`Ürün bulunamadı: ${pkgItem.productSlug}`);
      continue;
    }

    for (const [size, qty] of Object.entries(pkgItem.sizes)) {
      const variant = product.variants.find(
        (v) => v.color === pkgItem.color && v.size === size
      );
      if (!variant) {
        errors.push(`Varyant bulunamadı: ${product.name} ${pkgItem.color} ${size}`);
        continue;
      }

      cartItemsToCreate.push({
        dealerId: dealer.id,
        productId: product.id,
        variantId: variant.id,
        quantity: qty,
        standPackageId: standInstanceId,
        standPackageType: pkg.id,
      });
    }
  }

  if (errors.length > 0 && cartItemsToCreate.length === 0) {
    return NextResponse.json(
      { error: "Paket ürünleri bulunamadı", details: errors },
      { status: 400 }
    );
  }

  // Toplu oluştur — stand ürünleri mevcut sepet ile BİRLEŞTİRİLMEZ, ayrı kalır
  await db.cartItem.createMany({ data: cartItemsToCreate });

  return NextResponse.json({
    success: true,
    standPackageId: standInstanceId,
    itemCount: cartItemsToCreate.length,
    totalItems: pkg.totalItems,
    warnings: errors.length > 0 ? errors : undefined,
  });
}

// Stand paketini sepetten kaldır (tüm kalemleri siler)
export async function DELETE(req: NextRequest) {
  const dealer = await getDealerSession();
  if (!dealer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { standPackageId } = await req.json();
  if (!standPackageId) {
    return NextResponse.json({ error: "standPackageId gerekli" }, { status: 400 });
  }

  // Sadece bu bayinin bu paketini sil
  const deleted = await db.cartItem.deleteMany({
    where: {
      dealerId: dealer.id,
      standPackageId,
    },
  });

  return NextResponse.json({ success: true, deletedCount: deleted.count });
}
