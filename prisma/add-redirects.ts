/**
 * Eski ürün slug'larından yeni slug'lara 301 redirect ekler.
 * Kullanım: npx tsx prisma/add-redirects.ts
 *
 * Not: Sadece ten külot için gerekli (adı manuel değiştirildi).
 * Diğer 5 ürün güncellendiğinde redirect otomatik kaydedilecek.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const REDIRECTS = [
  {
    fromPath: "/urun/kadin-modal-kulot-ten",
    toPath: "/urun/vorte-premium-penye-kadin-kulot-ten",
  },
];

async function main() {
  for (const r of REDIRECTS) {
    const result = await db.redirect.upsert({
      where: { fromPath: r.fromPath },
      create: {
        fromPath: r.fromPath,
        toPath: r.toPath,
        permanent: true,
        active: true,
      },
      update: {
        toPath: r.toPath,
        active: true,
      },
    });
    console.log(`✅ Redirect eklendi: ${result.fromPath} → ${result.toPath}`);
  }

  console.log("\nTamamlandı! Diğer 5 ürün güncellendiğinde redirect otomatik kaydedilecek.");
}

main()
  .catch((e) => {
    console.error("Hata:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
