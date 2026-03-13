import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST /api/admin/seed-reviews — Eski yorumları sil, penye pamuk odaklı yenilerini ekle
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

  const user = await db.user.findFirst({ select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 400 });
  }

  // Eski seed yorumlarını sil
  await db.productReview.deleteMany({
    where: { orderId: { startsWith: "seed-review-" } },
  });

  // Erkek boxer yorumları
  const boxerReviews = [
    {
      rating: 5,
      title: "Penye kumaş farkı hissediliyor",
      comment: "Taranmış penye pamuk gerçekten fark yaratıyor. Gün boyu terletmedi, kumaş ipeksi ve pürüzsüz. Beden tam oturdu.",
    },
    {
      rating: 5,
      title: "Form koruma harika",
      comment: "Birkaç yıkamadan sonra bile sarkma yok, formunu koruyor. Sanfor garantisi gerçekten işe yarıyor, çekmedi.",
    },
    {
      rating: 4,
      title: "Kaliteli ve rahat",
      comment: "Dikiş kalitesi çok iyi, overlok dikişler sağlam. Fiyat/performans olarak piyasadaki en iyilerden.",
    },
  ];

  // Kadın külot yorumları
  const kulotReviews = [
    {
      rating: 5,
      title: "Pamuk astar çok hijyenik",
      comment: "%100 pamuk iç katman sayesinde cildi tahriş etmiyor. Penye kumaşı yumuşacık, gün boyu ferah hissettiriyor.",
    },
    {
      rating: 5,
      title: "Çekmedi, formunu korudu",
      comment: "Üç kez yıkadım, ilk günkü ölçüsünde duruyor. Elastan oranı tam kıvamında, sıkmıyor ama sarkmıyor.",
    },
    {
      rating: 4,
      title: "Günlük kullanım için ideal",
      comment: "160-170 gr/m² kalınlık tam 4 mevsim uygun. İç göstermiyor, terletmiyor. Paketleme de özenli geldi.",
    },
  ];

  let created = 0;

  for (const product of products) {
    const templates = product.gender === "ERKEK" ? boxerReviews : kulotReviews;

    for (let i = 0; i < templates.length; i++) {
      const tmpl = templates[i];
      const orderId = `seed-review-${i}`;

      await db.productReview.create({
        data: {
          userId: user.id,
          productId: product.id,
          orderId,
          rating: tmpl.rating,
          title: tmpl.title,
          comment: tmpl.comment,
          approved: true,
          createdAt: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000),
        },
      });
      created++;
    }
  }

  return NextResponse.json({
    success: true,
    created,
    products: products.length,
    message: `${products.length} ürüne toplam ${created} penye pamuk odaklı yorum eklendi.`,
  });
}
