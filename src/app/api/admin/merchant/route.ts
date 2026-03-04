"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET — merchant feed overview (stats + products)
export async function GET(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const filter = searchParams.get("filter") || ""; // "synced", "pending", "no-gtin", "no-category"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { active: true };

  if (filter === "synced") where.merchantSynced = true;
  if (filter === "pending") where.merchantSynced = false;
  if (filter === "no-category") where.googleCategory = null;

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        googleCategory: true,
        merchantSynced: true,
        merchantSyncedAt: true,
        images: true,
        variants: {
          where: { active: true },
          select: {
            id: true,
            sku: true,
            color: true,
            size: true,
            gtinBarcode: true,
            stock: true,
          },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  // Stats
  const [totalActive, synced, noCategory, noGtin] = await Promise.all([
    db.product.count({ where: { active: true } }),
    db.product.count({ where: { active: true, merchantSynced: true } }),
    db.product.count({ where: { active: true, googleCategory: null } }),
    db.product.count({
      where: {
        active: true,
        variants: { some: { active: true, gtinBarcode: null } },
      },
    }),
  ]);

  // Total variants in feed
  const totalVariants = await db.variant.count({
    where: { active: true, product: { active: true } },
  });

  return NextResponse.json({
    products,
    total,
    stats: {
      totalProducts: totalActive,
      synced,
      pending: totalActive - synced,
      noCategory,
      noGtin,
      totalVariants,
    },
  });
}

// POST — sync products (mark as synced / update categories)
export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const { action, productIds, googleCategory } = body;

  if (action === "sync") {
    // Mark products as synced
    const ids = Array.isArray(productIds) ? productIds : [];
    if (ids.length === 0) {
      // Sync all active products
      await db.product.updateMany({
        where: { active: true },
        data: { merchantSynced: true, merchantSyncedAt: new Date() },
      });
    } else {
      await db.product.updateMany({
        where: { id: { in: ids } },
        data: { merchantSynced: true, merchantSyncedAt: new Date() },
      });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "set-category") {
    // Set Google Product Category for products
    const ids = Array.isArray(productIds) ? productIds : [];
    if (ids.length === 0 || !googleCategory) {
      return NextResponse.json({ error: "Ürün ve kategori belirtilmeli" }, { status: 400 });
    }
    await db.product.updateMany({
      where: { id: { in: ids } },
      data: { googleCategory, merchantSynced: false },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "unsync") {
    const ids = Array.isArray(productIds) ? productIds : [];
    await db.product.updateMany({
      where: ids.length > 0 ? { id: { in: ids } } : { active: true },
      data: { merchantSynced: false, merchantSyncedAt: null },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
}
