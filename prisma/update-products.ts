/**
 * Canlı veritabanındaki ürün başlık, fiyat ve açıklamalarını günceller.
 * Seed.ts'den farklı olarak mevcut veriyi SILMEZ, sadece ürünleri UPDATE eder.
 *
 * Kullanım: npx tsx prisma/update-products.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const erkekBoxerDesc = `Vorte Premium Penye Erkek Boxer — gün boyu konfor, sarkma yok, terleme yok.

%95 taranmış penye pamuk ve %5 elastan (Lycra) karışımıyla üretilen bu boxer, uzun yol dahil her koşulda nefes alır ve formunu korur. Shape Recovery teknolojisi sayesinde esnedikten sonra bile ilk günkü formuna geri döner.

NEDEN VORTE?

• Taranmış penye pamuk yüzey — cildinize temas eden ipeksi, pürüzsüz bir his. Kısa elyaflı karde iplik kesinlikle kullanılmaz.
• Shape Recovery (Form Koruma) — esnedikten sonra sarkmayı önleyen yapı; gün boyu vücudunuza uyumlu kalır.
• 160–170 gr/m² optimum kalınlık — iç göstermeyen, terletmeyen, 4 mevsim ideal ağırlık.
• Sanfor garantili — yıkama sonrası çekmezlik testi geçmiştir; ilk günkü ölçüsünü korur.
• Yüksek mukavemetli overlok dikiş — dikiş patlaması riskini ortadan kaldıran tekstüre iplik.

TEKNİK ÖZELLİKLER:

• Kumaş: %95 Taranmış Penye Pamuk + %5 Elastan (Lycra)
• Gramaj: 160–170 gr/m²
• İplik: 30/1 – 36/1 Penye İplik
• Örgü: Süprem (Single Jersey)
• Dikiş: Yüksek mukavemetli overlok tekstüre iplik
• Çekmezlik: Sanfor testi garantili
• Ürün Ağırlığı: ~95 gr`;

const kadinKulotDesc = `Vorte Premium Penye Kadın Külot — gün boyu ferahlık, hijyen ve konfor bir arada.

%95 taranmış penye pamuk ve %5 elastan (Lycra) ile üretilen bu külot, doğal nefes alan yapısıyla gün boyu ferah hissettirir. Shape Recovery teknolojisi sayesinde esnedikten sonra bile formunu korur, sarkmaz.

NEDEN VORTE?

• %100 pamuk iç katman — ağ bölgesinde ekstra hijyen sağlayan saf pamuk astar. Cildiniz yalnızca doğal pamukla temas eder.
• Taranmış penye pamuk yüzey — ipeksi, pürüzsüz his. Kısa elyaflı karde iplik kesinlikle kullanılmaz.
• Shape Recovery (Form Koruma) — esnedikten sonra sarkmayı önleyen yapı; gün boyu vücudunuza uyumlu kalır.
• 160–170 gr/m² optimum kalınlık — iç göstermeyen, terletmeyen, 4 mevsim ideal ağırlık.
• Sanfor garantili — yıkama sonrası çekmezlik testi geçmiştir; ilk günkü ölçüsünü korur.
• Yüksek mukavemetli overlok dikiş — dikiş patlaması riskini ortadan kaldıran tekstüre iplik.

TEKNİK ÖZELLİKLER:

• Kumaş: %95 Taranmış Penye Pamuk + %5 Elastan (Lycra)
• Gramaj: 160–170 gr/m²
• İplik: 30/1 – 36/1 Penye İplik
• Örgü: Süprem (Single Jersey)
• İç Katman: %100 Pamuk (ağ bölgesi hijyen astarı)
• Dikiş: Yüksek mukavemetli overlok tekstüre iplik
• Çekmezlik: Sanfor testi garantili
• Ürün Ağırlığı: ~45 gr`;

interface ProductUpdate {
  slugPattern: string;
  namePrefix: string;
  basePrice: number;
  description: string;
  seoTitleSuffix: string;
  seoDescription: string;
}

const erkekBoxerUpdate: ProductUpdate = {
  slugPattern: "erkek-modal-boxer",
  namePrefix: "Vorte Premium Penye Erkek Boxer",
  basePrice: 249.90,
  description: erkekBoxerDesc,
  seoTitleSuffix: "Terletmez & Sarkmaz",
  seoDescription:
    "Taranmış penye pamuk ve elastan ile üretilen Vorte erkek boxer. Gün boyu nefes alır, formunu korur, sarkmaz. Uzun yol konforu için tasarlandı.",
};

const kadinKulotUpdate: ProductUpdate = {
  slugPattern: "kadin-modal-kulot",
  namePrefix: "Vorte Premium Penye Kadın Külot",
  basePrice: 169.90,
  description: kadinKulotDesc,
  seoTitleSuffix: "Nefes Alan & Hijyenik",
  seoDescription:
    "%100 pamuk iç katmanlı Vorte kadın külot. Taranmış penye pamuk, nefes alan yapı, gün boyu konfor. Sarkmaz, terletmez.",
};

// Renk slug → display name mapping
const colorMap: Record<string, string> = {
  siyah: "Siyah",
  lacivert: "Lacivert",
  gri: "Gri",
  beyaz: "Beyaz",
  ten: "Ten",
  pembe: "Pembe",
  kirmizi: "Kırmızı",
};

async function main() {
  console.log("🔄 Ürün verileri güncelleniyor...\n");

  const allProducts = await db.product.findMany({
    select: { id: true, slug: true, name: true, basePrice: true },
  });

  let updated = 0;

  for (const product of allProducts) {
    let config: ProductUpdate | null = null;

    if (product.slug.includes("erkek") && product.slug.includes("boxer")) {
      config = erkekBoxerUpdate;
    } else if (product.slug.includes("kadin") && product.slug.includes("kulot")) {
      config = kadinKulotUpdate;
    }

    if (!config) continue;

    // Extract color from slug (last segment)
    const slugParts = product.slug.split("-");
    const colorSlug = slugParts[slugParts.length - 1];
    const colorName = colorMap[colorSlug] || colorSlug.charAt(0).toUpperCase() + colorSlug.slice(1);

    const newName = `${config.namePrefix} ${colorName}`;
    const newSeoTitle = `${config.namePrefix} ${colorName} | ${config.seoTitleSuffix}`;

    await db.product.update({
      where: { id: product.id },
      data: {
        name: newName,
        basePrice: config.basePrice,
        description: config.description,
        seoTitle: newSeoTitle,
        seoDescription: config.seoDescription,
      },
    });

    console.log(
      `  ✅ ${product.slug}: "${product.name}" → "${newName}" | ₺${product.basePrice} → ₺${config.basePrice}`
    );
    updated++;
  }

  console.log(`\n✅ ${updated} ürün güncellendi.`);
}

main()
  .catch((e) => {
    console.error("❌ Güncelleme başarısız:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
