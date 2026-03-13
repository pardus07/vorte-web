import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// POST /api/admin/seed-reviews — Farklı kullanıcılarla penye pamuk yorumları
export async function POST() {
  const session = await auth();
  const role = (session?.user as unknown as { role: string } | undefined)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Eski seed yorumlarını sil
  await db.productReview.deleteMany({
    where: { orderId: { startsWith: "seed-review-" } },
  });

  // Eski seed kullanıcılarını sil
  await db.user.deleteMany({
    where: { email: { startsWith: "seed-" } },
  });

  const hash = await bcrypt.hash("vorte2026", 10);

  // Erkek yorum kullanıcıları
  const erkekUsers = [
    { name: "Ahmet Yılmaz", email: "seed-ahmet@vorte.com.tr" },
    { name: "Murat Kaya", email: "seed-murat@vorte.com.tr" },
    { name: "Emre Demir", email: "seed-emre@vorte.com.tr" },
  ];

  // Kadın yorum kullanıcıları
  const kadinUsers = [
    { name: "Ayşe Çelik", email: "seed-ayse@vorte.com.tr" },
    { name: "Elif Şahin", email: "seed-elif@vorte.com.tr" },
    { name: "Zeynep Arslan", email: "seed-zeynep@vorte.com.tr" },
  ];

  const createdErkekUsers = [];
  for (const u of erkekUsers) {
    const user = await db.user.create({
      data: { name: u.name, email: u.email, passwordHash: hash, role: "CUSTOMER" },
    });
    createdErkekUsers.push(user);
  }

  const createdKadinUsers = [];
  for (const u of kadinUsers) {
    const user = await db.user.create({
      data: { name: u.name, email: u.email, passwordHash: hash, role: "CUSTOMER" },
    });
    createdKadinUsers.push(user);
  }

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

  const products = await db.product.findMany({
    where: { active: true },
    select: { id: true, name: true, gender: true },
  });

  let created = 0;

  for (const product of products) {
    const isErkek = product.gender === "ERKEK";
    const templates = isErkek ? boxerReviews : kulotReviews;
    const users = isErkek ? createdErkekUsers : createdKadinUsers;

    for (let i = 0; i < templates.length; i++) {
      const tmpl = templates[i];
      const orderId = `seed-review-${i}`;

      await db.productReview.create({
        data: {
          userId: users[i].id,
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
    users: { erkek: erkekUsers.map(u => u.name), kadin: kadinUsers.map(u => u.name) },
    message: `${products.length} ürüne toplam ${created} yorum eklendi (farklı kullanıcılar).`,
  });
}
