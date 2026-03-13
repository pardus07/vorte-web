import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST /api/admin/seed-reviews — Tüm ürünlere gerçekçi onaylı yorum ekle
export async function POST() {
  const session = await auth();
  const role = (session?.user as unknown as { role: string } | undefined)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Aktif ürünleri al
  const products = await db.product.findMany({
    where: { active: true },
    select: { id: true, name: true, gender: true },
  });

  // İlk kullanıcıyı al (admin veya herhangi bir user)
  const user = await db.user.findFirst({
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Hiç kullanıcı bulunamadı" }, { status: 400 });
  }

  const reviewTemplates = [
    {
      rating: 5,
      title: "Çok memnunum",
      comment: "Kumaş kalitesi harika, terletmiyor. Beden tam oturdu. Kesinlikle tekrar alacağım.",
    },
    {
      rating: 5,
      title: "Harika ürün",
      comment: "Paketleme çok özenli geldi. Kumaşı yumuşacık, günlük kullanım için ideal.",
    },
    {
      rating: 4,
      title: "Kaliteli ve rahat",
      comment: "Fiyat/performans olarak çok iyi. Modal kumaş gerçekten fark yaratıyor.",
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const product of products) {
    for (let i = 0; i < reviewTemplates.length; i++) {
      const tmpl = reviewTemplates[i];

      // Aynı user+product+orderId kombinasyonu varsa atla
      const orderId = `seed-review-${i}`;
      const existing = await db.productReview.findUnique({
        where: {
          userId_productId_orderId: {
            userId: user.id,
            productId: product.id,
            orderId,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.productReview.create({
        data: {
          userId: user.id,
          productId: product.id,
          orderId,
          rating: tmpl.rating,
          title: tmpl.title,
          comment: tmpl.comment,
          approved: true,
          createdAt: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000), // 1-3 hafta önce
        },
      });
      created++;
    }
  }

  return NextResponse.json({
    success: true,
    created,
    skipped,
    products: products.length,
    message: `${products.length} ürüne toplam ${created} yorum eklendi.`,
  });
}
