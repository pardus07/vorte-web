import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await db.testimonial.deleteMany();
  await db.giftCard.deleteMany();
  await db.searchLog.deleteMany();
  await db.abandonedCart.deleteMany();
  await db.loyaltyPoint.deleteMany();
  await db.stockAlert.deleteMany();
  await db.userPreference.deleteMany();
  await db.notification.deleteMany();
  await db.cartItem.deleteMany();
  await db.favorite.deleteMany();
  await db.orderItem.deleteMany();
  await db.payment.deleteMany();
  await db.invoice.deleteMany();
  await db.order.deleteMany();
  await db.dealerPrice.deleteMany();
  await db.variant.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.coupon.deleteMany();
  await db.address.deleteMany();
  await db.dealer.deleteMany();
  await db.user.deleteMany();

  console.log("  ✓ Cleaned existing data");

  // ===== USERS =====
  const passwordHash = await bcryptjs.hash("123456", 12);

  const admin = await db.user.create({
    data: {
      email: "admin@vorte.com.tr",
      name: "Admin Kullanıcı",
      phone: "0532 000 0001",
      passwordHash,
      role: "ADMIN",
    },
  });

  const customer = await db.user.create({
    data: {
      email: "musteri@test.com",
      name: "Ahmet Yılmaz",
      phone: "0532 000 0002",
      passwordHash,
      role: "CUSTOMER",
    },
  });

  console.log("  ✓ Users created (admin@vorte.com.tr / 123456)");

  // ===== DEALERS =====
  const dealer = await db.dealer.create({
    data: {
      companyName: "Shell Nilüfer İstasyonu",
      taxNumber: "1234567890",
      taxOffice: "Nilüfer V.D.",
      dealerCode: "BAY-SHELL01",
      passwordHash,
      contactName: "Mehmet Demir",
      phone: "0224 000 0001",
      email: "nilufer@shell.com.tr",
      city: "Bursa",
      district: "Nilüfer",
      address: "Atatürk Mah. İstanbul Cad. No:123",
      status: "ACTIVE",
      approvedAt: new Date(),
    },
  });

  const dealer2 = await db.dealer.create({
    data: {
      companyName: "Shell Osmangazi İstasyonu",
      taxNumber: "0987654321",
      taxOffice: "Osmangazi V.D.",
      dealerCode: "BAY-SHELL02",
      passwordHash,
      contactName: "Ali Kaya",
      phone: "0224 000 0002",
      email: "osmangazi@shell.com.tr",
      city: "Bursa",
      district: "Osmangazi",
      address: "Cumhuriyet Cad. No:456",
      status: "ACTIVE",
      approvedAt: new Date(),
    },
  });

  console.log("  ✓ Dealers created (BAY-SHELL01 / 123456)");

  // ===== CATEGORIES =====
  const catErkekBoxer = await db.category.create({
    data: { name: "Erkek Boxer", slug: "erkek-boxer", gender: "ERKEK", sortOrder: 1 },
  });

  const catKadinKulot = await db.category.create({
    data: { name: "Kadın Külot", slug: "kadin-kulot", gender: "KADIN", sortOrder: 1 },
  });

  console.log("  ✓ Categories created");

  // ===== PRODUCTS & VARIANTS =====

  // --- ERKEK BOXER: Siyah açıklama (AEO uyumlu) ---
  const erkekBoxerSiyahDesc = `Vorte Premium Penye Erkek Boxer Siyah, %95 taranmış penye pamuk ve %5 elastan karışımıyla üretilmiş, gün boyu kuru ve rahat tutan bir erkek iç çamaşırıdır. 160–170 gr/m² kumaş kalınlığı dayanıklılık sağlarken, yüksek mukavemetli overlok dikiş cilt tahrişini önler. Siyah renk her kombinin altında görünmez, klasik ve zamansız bir tercih sunar. Türkiye'de üretilmiştir.

TARANMIŞ PENYE PAMUK NEDİR VE NEDEN ÖNEMLİDİR?

Taranmış penye pamuk, standart pamuktan farklı olarak kısa ve düzensiz elyafların taranarak ayrıldığı, yalnızca uzun elyafların kullanıldığı premium bir iplik türüdür. Sonuç: ipeksi, pürüzsüz bir yüzey ve daha yüksek dayanıklılık. Karde ipliğin verdiği kaşıntı ve tüylenme olmaz.

SİYAH ERKEK BOXER KİMLER İÇİN İDEAL?

Ofiste uzun saatler geçiren profesyoneller, iş toplantılarında ve resmi kıyafetlerin altında siyah boxer güvenli bir tercihtir. Koyu renkli pantolon ve takım elbise altında tamamen görünmez kalır. Özel geceler ve akşam yemekleri için de klasik siyah her zaman doğru seçimdir. Kombini düşünmek istemeyenler için "gözü kapalı giyilebilen" renktir.

TEKNİK ÖZELLİKLER:

• Kumaş: %95 Taranmış Penye Pamuk + %5 Elastan (Lycra)
• Gramaj: 160–170 gr/m²
• İplik: 30/1 – 36/1 Penye İplik
• Örgü: Süprem (Single Jersey)
• Dikiş: Yüksek mukavemetli overlok tekstüre iplik
• Çekmezlik: Sanfor testi garantili
• Elastan katkısı: Esneme sonrası formuna döner, sarkma yapmaz
• Ürün Ağırlığı: ~95 gr

BEDEN REHBERİ:

• S (36-38): Bel 76–82 cm
• M (38-40): Bel 83–89 cm
• L (40-42): Bel 90–96 cm
• XL (42-44): Bel 97–105 cm
• XXL (44-46): Bel 106–116 cm
İki beden arasında kalırsanız büyük bedeni tercih edin. Bel çevrenizi göbek hizasından mezura ile ölçün.

BAKIM TALİMATLARI:

• 30°C'de makine yıkama yapılabilir
• Çamaşır suyu kullanmayın
• Asarak kurutma önerilir
• Ütü gerektirmez
• Benzer renklerle yıkayın

SIKÇA SORULAN SORULAR:

Taranmış penye pamuk boxer ne kadar dayanıklıdır?
Sanfor testi garantili kumaş, yıkama sonrası çekmez ve uzun süre formunu korur. Overlok dikiş tekniği sökülme riskini en aza indirir.

Boxer beden seçimi nasıl yapılır?
Bel çevrenizi göbek hizasından mezura ile ölçün ve yukarıdaki tabloya bakın. Sıkı giymek istemiyorsanız bir üst beden tercih edin.

Penye pamuk mu yoksa normal pamuk mu daha rahat?
Taranmış penye pamuk, normal (karde) pamuktan daha pürüzsüz ve yumuşaktır. Cilt teması daha konforludur ve tüylenme yapmaz.`;

  // --- ERKEK BOXER: Siyah ---
  const erkekBoxerSiyah = await db.product.create({
    data: {
      name: "Vorte Premium Penye Erkek Boxer Siyah",
      slug: "erkek-modal-boxer-siyah",
      description: erkekBoxerSiyahDesc,
      seoTitle: "Vorte Premium Penye Erkek Boxer Siyah | Terletmez & Sarkmaz",
      seoDescription: "%95 penye pamuk erkek boxer siyah. Gün boyu nefes alır, formunu korur, sarkmaz. Sanfor garantili, Türkiye üretimi.",
      categoryId: catErkekBoxer.id,
      gender: "ERKEK",
      basePrice: 249.90,
      featured: true,
      images: [
        "/images/erkek-boxer-siyah-1.png",
        "/images/erkek-boxer-siyah-2.png",
        "/images/erkek-boxer-siyah-3.png",
        "/images/erkek-boxer-siyah-4.png",
      ],
    },
  });

  const GTIN_MAP: Record<string, string> = {
    "VRT-MBX-SYH-S": "8685094180009",
    "VRT-MBX-SYH-M": "8685094180016",
    "VRT-MBX-SYH-L": "8685094180023",
    "VRT-MBX-SYH-XL": "8685094180030",
    "VRT-MBX-SYH-XXL": "8685094180047",
    "VRT-MBX-LCV-S": "8685094180054",
    "VRT-MBX-LCV-M": "8685094180061",
    "VRT-MBX-LCV-L": "8685094180078",
    "VRT-MBX-LCV-XL": "8685094180085",
    "VRT-MBX-LCV-XXL": "8685094180092",
    "VRT-MBX-GRI-S": "8685094180108",
    "VRT-MBX-GRI-M": "8685094180115",
    "VRT-MBX-GRI-L": "8685094180122",
    "VRT-MBX-GRI-XL": "8685094180139",
    "VRT-MBX-GRI-XXL": "8685094180146",
    "VRT-MKL-SYH-S": "8685094180153",
    "VRT-MKL-SYH-M": "8685094180160",
    "VRT-MKL-SYH-L": "8685094180177",
    "VRT-MKL-SYH-XL": "8685094180184",
    "VRT-MKL-SYH-XXL": "8685094180191",
    "VRT-MKL-BYZ-S": "8685094180207",
    "VRT-MKL-BYZ-M": "8685094180214",
    "VRT-MKL-BYZ-L": "8685094180221",
    "VRT-MKL-BYZ-XL": "8685094180238",
    "VRT-MKL-BYZ-XXL": "8685094180245",
    "VRT-MKL-TEN-S": "8685094180252",
    "VRT-MKL-TEN-M": "8685094180269",
    "VRT-MKL-TEN-L": "8685094180276",
    "VRT-MKL-TEN-XL": "8685094180283",
    "VRT-MKL-TEN-XXL": "8685094180290",
  };

  for (const size of ["S", "M", "L", "XL", "XXL"]) {
    const sku = `VRT-MBX-SYH-${size}`;
    await db.variant.create({
      data: {
        productId: erkekBoxerSiyah.id,
        color: "Siyah",
        colorHex: "#000000",
        size: size as "S" | "M" | "L" | "XL" | "XXL",
        sku,
        stock: 50,
        gtinBarcode: GTIN_MAP[sku],
      },
    });
  }

  // --- ERKEK BOXER: Lacivert açıklama (AEO uyumlu) ---
  const erkekBoxerLacivertDesc = `Vorte Premium Penye Erkek Boxer Lacivert, siyah kadar sade ama daha modern bir alternatif arayan erkekler için tasarlandı. %95 taranmış penye pamuk ve %5 elastan karışımı, günlük tempoya ayak uyduran esneklik ve nefes alabilirlik sunar. Spor sonrası duştan çıkıp giyebileceğiniz, hafta sonu brunch'a da iş yerine de uyum sağlayan spor-şık bir renk. Türkiye'de üretilmiştir.

TARANMIŞ PENYE PAMUK NEDİR VE NEDEN ÖNEMLİDİR?

Taranmış penye pamuk, kısa ve düzensiz elyafların taranarak ayrıldığı, yalnızca uzun elyafların kullanıldığı premium bir iplik türüdür. Sonuç: ipeksi, pürüzsüz bir yüzey ve yüksek dayanıklılık. Karde ipliğin verdiği kaşıntı ve tüylenme olmaz.

LACİVERT ERKEK BOXER KİMLER İÇİN İDEAL?

Günlük hayatında aktif olan, spor sonrası doğrudan sosyal ortama geçen erkekler için lacivert doğru renk. Kot pantolon, chino ve casual kombinlerin altında siyahın ağırlığını taşımadan şık kalır. Hafta içi ofis, hafta sonu açık hava — lacivert her ikisinde de rahat eder. Siyahtan sıkılanlar için modern ve enerjik bir alternatiftir.

TEKNİK ÖZELLİKLER:

• Kumaş: %95 Taranmış Penye Pamuk + %5 Elastan (Lycra)
• Gramaj: 160–170 gr/m²
• İplik: 30/1 – 36/1 Penye İplik
• Örgü: Süprem (Single Jersey)
• Dikiş: Yüksek mukavemetli overlok tekstüre iplik
• Çekmezlik: Sanfor testi garantili
• Elastan katkısı: Esneme sonrası formuna döner, sarkma yapmaz
• Ürün Ağırlığı: ~95 gr

BEDEN REHBERİ:

• S (36-38): Bel 76–82 cm
• M (38-40): Bel 83–89 cm
• L (40-42): Bel 90–96 cm
• XL (42-44): Bel 97–105 cm
• XXL (44-46): Bel 106–116 cm
İki beden arasında kalırsanız büyük bedeni tercih edin. Bel çevrenizi göbek hizasından mezura ile ölçün.

BAKIM TALİMATLARI:

• 30°C'de makine yıkama yapılabilir
• Çamaşır suyu kullanmayın
• Asarak kurutma önerilir
• Ütü gerektirmez
• Benzer renklerle yıkayın

SIKÇA SORULAN SORULAR:

Lacivert boxer açık renkli pantolonun altında belli eder mi?
Lacivert orta tonlu bir renk olduğu için koyu ve orta tonlu kıyafetlerin altında görünmez. Çok açık renkli pantolonlar için gri tercih edilebilir.

Boxer beden seçimi nasıl yapılır?
Bel çevrenizi göbek hizasından mezura ile ölçün ve yukarıdaki tabloya bakın. Sıkı giymek istemiyorsanız bir üst beden tercih edin.

Penye pamuk mu yoksa normal pamuk mu daha rahat?
Taranmış penye pamuk, normal (karde) pamuktan daha pürüzsüz ve yumuşaktır. Cilt teması daha konforludur ve tüylenme yapmaz.`;

  // --- ERKEK BOXER: Lacivert ---
  const erkekBoxerLacivert = await db.product.create({
    data: {
      name: "Vorte Premium Penye Erkek Boxer Lacivert",
      slug: "erkek-modal-boxer-lacivert",
      description: erkekBoxerLacivertDesc,
      seoTitle: "Vorte Premium Penye Erkek Boxer Lacivert | Terletmez & Sarkmaz",
      seoDescription: "%95 penye pamuk erkek boxer lacivert. Spor-şık günlük tercih, nefes alır, sarkmaz. Sanfor garantili, Türkiye üretimi.",
      categoryId: catErkekBoxer.id,
      gender: "ERKEK",
      basePrice: 249.90,
      featured: true,
      images: [
        "/images/erkek-boxer-lacivert-1.png",
        "/images/erkek-boxer-lacivert-2.png",
        "/images/erkek-boxer-lacivert-3.png",
        "/images/erkek-boxer-lacivert-4.png",
      ],
    },
  });

  for (const size of ["S", "M", "L", "XL", "XXL"]) {
    const sku = `VRT-MBX-LCV-${size}`;
    await db.variant.create({
      data: {
        productId: erkekBoxerLacivert.id,
        color: "Lacivert",
        colorHex: "#1B2A4A",
        size: size as "S" | "M" | "L" | "XL" | "XXL",
        sku,
        stock: 50,
        gtinBarcode: GTIN_MAP[sku],
      },
    });
  }

  // --- ERKEK BOXER: Gri açıklama (AEO uyumlu) ---
  const erkekBoxerGriDesc = `Vorte Premium Penye Erkek Boxer Gri, açık renkli kıyafetlerin altında iz bırakmayan, nötr ve görünmez bir iç çamaşırıdır. %95 taranmış penye pamuk ve %5 elastan karışımı, özellikle yaz aylarında hafif ve serin bir his sunar. Beyaz gömlek, keten pantolon ya da açık ton chino'ların altında siyah veya laciverdin belli ettiği yerde gri tamamen kaybolur. Türkiye'de üretilmiştir.

TARANMIŞ PENYE PAMUK NEDİR VE NEDEN ÖNEMLİDİR?

Taranmış penye pamuk, kısa ve düzensiz elyafların taranarak ayrıldığı, yalnızca uzun elyafların kullanıldığı premium bir iplik türüdür. Sonuç: ipeksi, pürüzsüz bir yüzey ve yüksek dayanıklılık. Karde ipliğin verdiği kaşıntı ve tüylenme olmaz.

GRİ ERKEK BOXER KİMLER İÇİN İDEAL?

Yaz aylarında açık renkli kıyafetler giyen, beyaz pantolon veya keten tercih eden erkekler için gri olmazsa olmaz renktir. Spor yaparken de nötr tonu sayesinde ter lekesi belli etmez. Minimalist giyim tarzını benimseyenler ve dolabında "her şeyin altına giyebileceğim" tek bir renk isteyenler için gri en pratik seçimdir. Özellikle sıcak havalarda açık tonun verdiği psikolojik serinlik hissi de cabası.

TEKNİK ÖZELLİKLER:

• Kumaş: %95 Taranmış Penye Pamuk + %5 Elastan (Lycra)
• Gramaj: 160–170 gr/m²
• İplik: 30/1 – 36/1 Penye İplik
• Örgü: Süprem (Single Jersey)
• Dikiş: Yüksek mukavemetli overlok tekstüre iplik
• Çekmezlik: Sanfor testi garantili
• Elastan katkısı: Esneme sonrası formuna döner, sarkma yapmaz
• Ürün Ağırlığı: ~95 gr

BEDEN REHBERİ:

• S (36-38): Bel 76–82 cm
• M (38-40): Bel 83–89 cm
• L (40-42): Bel 90–96 cm
• XL (42-44): Bel 97–105 cm
• XXL (44-46): Bel 106–116 cm
İki beden arasında kalırsanız büyük bedeni tercih edin. Bel çevrenizi göbek hizasından mezura ile ölçün.

BAKIM TALİMATLARI:

• 30°C'de makine yıkama yapılabilir
• Çamaşır suyu kullanmayın
• Asarak kurutma önerilir
• Ütü gerektirmez
• Benzer renklerle yıkayın

SIKÇA SORULAN SORULAR:

Gri boxer beyaz pantolonun altında görünür mü?
Gri, cilt tonuna en yakın nötr renklerden biridir. Beyaz ve açık renkli kıyafetlerin altında siyah veya laciverte göre çok daha az belli eder.

Boxer beden seçimi nasıl yapılır?
Bel çevrenizi göbek hizasından mezura ile ölçün ve yukarıdaki tabloya bakın. Sıkı giymek istemiyorsanız bir üst beden tercih edin.

Penye pamuk mu yoksa normal pamuk mu daha rahat?
Taranmış penye pamuk, normal (karde) pamuktan daha pürüzsüz ve yumuşaktır. Cilt teması daha konforludur ve tüylenme yapmaz.`;

  // --- ERKEK BOXER: Gri ---
  const erkekBoxerGri = await db.product.create({
    data: {
      name: "Vorte Premium Penye Erkek Boxer Gri",
      slug: "erkek-modal-boxer-gri",
      description: erkekBoxerGriDesc,
      seoTitle: "Vorte Premium Penye Erkek Boxer Gri | Terletmez & Sarkmaz",
      seoDescription: "%95 penye pamuk erkek boxer gri. Açık renkli kıyafetlerin altında görünmez, nefes alır, sarkmaz. Sanfor garantili, Türkiye üretimi.",
      categoryId: catErkekBoxer.id,
      gender: "ERKEK",
      basePrice: 249.90,
      featured: true,
      images: [
        "/images/erkek-boxer-gri-1.png",
        "/images/erkek-boxer-gri-2.png",
        "/images/erkek-boxer-gri-3.png",
        "/images/erkek-boxer-gri-4.png",
      ],
    },
  });

  for (const size of ["S", "M", "L", "XL", "XXL"]) {
    const sku = `VRT-MBX-GRI-${size}`;
    await db.variant.create({
      data: {
        productId: erkekBoxerGri.id,
        color: "Gri",
        colorHex: "#808080",
        size: size as "S" | "M" | "L" | "XL" | "XXL",
        sku,
        stock: 50,
        gtinBarcode: GTIN_MAP[sku],
      },
    });
  }

  // --- KADIN KÜLOT: Siyah açıklama (AEO uyumlu) ---
  const kadinKulotSiyahDesc = `Vorte Premium Penye Kadın Külot Siyah, zamansız şıklığıyla her mevsim ve her kıyafetle uyumlu çalışan çok yönlü bir iç çamaşırıdır. %95 taranmış penye pamuk ve %5 elastan karışımı gün boyu konfor sağlarken, ağ bölgesinde %100 saf pamuk iç katman hijyen güvencesi sunar. Sabah ofise, akşam yemeğe — siyah her geçişte doğru tercih olarak kalır. Türkiye'de üretilmiştir.

TARANMIŞ PENYE PAMUK İÇ GİYİMDE NEDEN FARK YARATIR?

Taranmış penye pamuk, kısa elyafların taranarak ayrıldığı, yalnızca uzun ve düzgün elyafların kullanıldığı premium bir iplik türüdür. Ciltle temas eden yüzey ipeksi ve pürüzsüzdür — karde ipliğin verdiği kaşıntı ve tüylenme olmaz.

SİYAH KADIN KÜLOT KİMLER İÇİN İDEAL?

İş hayatı, günlük yaşam ve özel geceler arasında sürekli geçiş yapan kadınlar için siyah en pratik seçenektir. Koyu renkli kıyafetlerin altında tamamen görünmez, tayt ve dar pantolonlarda çizgi bırakmaz. Adet dönemlerinde güven veren bir renk olmasıyla da tercih sebebidir. Dolabında tek bir renk bulundurmak isteyen minimalistler için siyah tüm koşulları karşılar — mevsim, kıyafet ve ortam fark etmez.

TEKNİK ÖZELLİKLER:

• Kumaş: %95 Taranmış Penye Pamuk + %5 Elastan (Lycra)
• İç Katman: %100 Pamuk — ağ bölgesinde ekstra hijyen astarı
• Gramaj: 160–170 gr/m²
• İplik: 30/1 – 36/1 Penye İplik
• Örgü: Süprem (Single Jersey)
• Dikiş: Yüksek mukavemetli overlok tekstüre iplik
• Çekmezlik: Sanfor testi garantili
• Elastan katkısı: Esneme sonrası formuna döner, sarkma yapmaz
• Ürün Ağırlığı: ~45 gr

BEDEN REHBERİ:

• S (36-38): Bel 64–70 cm / Kalça 88–94 cm
• M (38-40): Bel 70–76 cm / Kalça 94–100 cm
• L (40-42): Bel 76–82 cm / Kalça 100–106 cm
• XL (42-44): Bel 82–88 cm / Kalça 106–112 cm
• XXL (44-46): Bel 88–94 cm / Kalça 112–118 cm
İki beden arasında kalırsanız büyük bedeni tercih edin. Bel çevrenizi en ince noktadan, kalça çevrenizi en geniş noktadan ölçün.

BAKIM TALİMATLARI:

• 30°C'de makine yıkama yapılabilir
• Çamaşır suyu kullanmayın — siyah solar
• Asarak kurutma önerilir
• Ütü gerektirmez
• Benzer renklerle yıkayın — açık renklerle karıştırmayın

SIKÇA SORULAN SORULAR:

Siyah külot açık renkli kıyafetlerin altında belli eder mi?
Evet, beyaz veya çok açık renkli ince kumaşların altında siyah belli edebilir. Bu durumda ten rengi tercih edin. Orta ve koyu tonlu kıyafetlerde siyah görünmez.

Kadın külot beden seçimi nasıl yapılır?
Bel ve kalça çevrenizi ölçüp yukarıdaki tabloya bakın. Rahat kullanım için sıkıştırmayan bedeni seçin.

%100 pamuk iç katman ne işe yarar?
Ağ bölgesindeki saf pamuk astar, cildin yalnızca doğal pamukla temas etmesini sağlar. Nefes alabilirliği artırır ve hijyen güvencesi sunar.`;

  // --- KADIN KÜLOT: Siyah ---
  const kadinKulotSiyah = await db.product.create({
    data: {
      name: "Vorte Premium Penye Kadın Külot Siyah",
      slug: "kadin-modal-kulot-siyah",
      description: kadinKulotSiyahDesc,
      seoTitle: "Vorte Premium Penye Kadın Külot Siyah | Nefes Alan & Hijyenik",
      seoDescription: "%95 penye pamuk kadın külot siyah. %100 pamuk iç katman, gün boyu konfor. Her kıyafetle uyumlu, Türkiye üretimi.",
      categoryId: catKadinKulot.id,
      gender: "KADIN",
      basePrice: 169.90,
      featured: true,
      images: [
        "/images/kadin-kulot-siyah-1.png",
        "/images/kadin-kulot-siyah-2.png",
        "/images/kadin-kulot-siyah-3.png",
        "/images/kadin-kulot-siyah-4.png",
      ],
    },
  });

  for (const size of ["S", "M", "L", "XL", "XXL"]) {
    const sku = `VRT-MKL-SYH-${size}`;
    await db.variant.create({
      data: {
        productId: kadinKulotSiyah.id,
        color: "Siyah",
        colorHex: "#000000",
        size: size as "S" | "M" | "L" | "XL" | "XXL",
        sku,
        stock: 50,
        gtinBarcode: GTIN_MAP[sku],
      },
    });
  }

  // --- KADIN KÜLOT: Beyaz açıklama (AEO uyumlu) ---
  const kadinKulotBeyazDesc = `Vorte Premium Penye Kadın Külot Beyaz, ferah ve hijyenik hissiyle özellikle yaz aylarının vazgeçilmez iç çamaşırıdır. %95 taranmış penye pamuk ve %5 elastan karışımı, sıcak havalarda bile nefes alan bir konfor sunar. Ağ bölgesinde %100 saf pamuk iç katman hijyen güvencesi sağlar. Beyaz ve pastel tonlu kıyafetlerle ideal uyum yakalar, günlük kullanımda temizlik ve tazelik hissi verir. Türkiye'de üretilmiştir.

TARANMIŞ PENYE PAMUK İÇ GİYİMDE NEDEN FARK YARATIR?

Taranmış penye pamuk, kısa elyafların taranarak ayrıldığı, yalnızca uzun ve düzgün elyafların kullanıldığı premium bir iplik türüdür. Ciltle temas eden yüzey ipeksi ve pürüzsüzdür — karde ipliğin verdiği kaşıntı ve tüylenme olmaz.

BEYAZ KADIN KÜLOT KİMLER İÇİN İDEAL?

Yaz aylarında ferahlık arayanlar için beyaz en doğal seçimdir. Beyaz pantolon, keten etek ve pastel tonlu kıyafetlerle uyumlu çalışır. Günlük kullanımda temizlik ve tazelik hissini ön planda tutan kadınlar beyazı tercih eder. Pamuklu pijama ve ev kıyafetlerinin altında da rahatlığıyla öne çıkar. Hijyen hassasiyeti yüksek olanlar için beyaz, kirliliğin anında fark edilmesini sağlayan en pratik renktir.

TEKNİK ÖZELLİKLER:

• Kumaş: %95 Taranmış Penye Pamuk + %5 Elastan (Lycra)
• İç Katman: %100 Pamuk — ağ bölgesinde ekstra hijyen astarı
• Gramaj: 160–170 gr/m²
• İplik: 30/1 – 36/1 Penye İplik
• Örgü: Süprem (Single Jersey)
• Dikiş: Yüksek mukavemetli overlok tekstüre iplik
• Çekmezlik: Sanfor testi garantili
• Elastan katkısı: Esneme sonrası formuna döner, sarkma yapmaz
• Ürün Ağırlığı: ~45 gr

BEDEN REHBERİ:

• S (36-38): Bel 64–70 cm / Kalça 88–94 cm
• M (38-40): Bel 70–76 cm / Kalça 94–100 cm
• L (40-42): Bel 76–82 cm / Kalça 100–106 cm
• XL (42-44): Bel 82–88 cm / Kalça 106–112 cm
• XXL (44-46): Bel 88–94 cm / Kalça 112–118 cm
İki beden arasında kalırsanız büyük bedeni tercih edin. Bel çevrenizi en ince noktadan, kalça çevrenizi en geniş noktadan ölçün.

BAKIM TALİMATLARI:

• 30°C'de makine yıkama yapılabilir
• Beyaz için oksijen bazlı ağartıcı kullanılabilir (klorlu çamaşır suyu önerilmez)
• Asarak kurutma önerilir — güneşte kurutma beyazlığı korur
• Ütü gerektirmez
• Beyazları ayrı yıkayın — renk geçişi riski

SIKÇA SORULAN SORULAR:

Beyaz külot koyu kıyafetlerin altında belli eder mi?
Evet, koyu renkli ince kumaşların altında beyaz belli edebilir. Koyu kıyafetler için siyah, ince kumaşlar için ten rengi tercih edin.

Beyaz külotun beyazlığı nasıl korunur?
Beyazları ayrı yıkayın, oksijen bazlı ağartıcı kullanabilirsiniz. Güneşte kurutma doğal ağartma etkisi yapar.

%100 pamuk iç katman ne işe yarar?
Ağ bölgesindeki saf pamuk astar, cildin yalnızca doğal pamukla temas etmesini sağlar. Nefes alabilirliği artırır ve hijyen güvencesi sunar.`;

  // --- KADIN KÜLOT: Beyaz ---
  const kadinKulotBeyaz = await db.product.create({
    data: {
      name: "Vorte Premium Penye Kadın Külot Beyaz",
      slug: "kadin-modal-kulot-beyaz",
      description: kadinKulotBeyazDesc,
      seoTitle: "Vorte Premium Penye Kadın Külot Beyaz | Nefes Alan & Hijyenik",
      seoDescription: "%95 penye pamuk kadın külot beyaz. %100 pamuk iç katman, yaz aylarında ferah konfor. Hijyenik, Türkiye üretimi.",
      categoryId: catKadinKulot.id,
      gender: "KADIN",
      basePrice: 169.90,
      featured: true,
      images: [
        "/images/kadin-kulot-beyaz-1.png",
        "/images/kadin-kulot-beyaz-2.png",
        "/images/kadin-kulot-beyaz-3.png",
        "/images/kadin-kulot-beyaz-4.png",
      ],
    },
  });

  for (const size of ["S", "M", "L", "XL", "XXL"]) {
    const sku = `VRT-MKL-BYZ-${size}`;
    await db.variant.create({
      data: {
        productId: kadinKulotBeyaz.id,
        color: "Beyaz",
        colorHex: "#FFFFFF",
        size: size as "S" | "M" | "L" | "XL" | "XXL",
        sku,
        stock: 50,
        gtinBarcode: GTIN_MAP[sku],
      },
    });
  }

  // --- KADIN KÜLOT: Ten açıklama (AEO uyumlu) ---
  const kadinKulotTenDesc = `Vorte Premium Penye Kadın Külot Ten, cilt tonuna en yakın renk olarak ince kumaşların altında tamamen görünmez kalır. %95 taranmış penye pamuk ve %5 elastan karışımı, gün boyu ferahlık ve konfor sağlar. Ağ bölgesinde %100 saf pamuk iç katman hijyen güvencesi sunar. Elbise, etek ve ince kumaşlı kıyafetlerin altında iz bırakmayan, kadın dolabının olmazsa olmaz parçasıdır. Türkiye'de üretilmiştir.

TARANMIŞ PENYE PAMUK İÇ GİYİMDE NEDEN FARK YARATIR?

Taranmış penye pamuk, kısa elyafların taranarak ayrıldığı, yalnızca uzun ve düzgün elyafların kullanıldığı premium bir iplik türüdür. Ciltle temas eden yüzey ipeksi ve pürüzsüzdür — karde ipliğin verdiği kaşıntı ve tüylenme olmaz.

TEN RENGİ KADIN KÜLOT KİMLER İÇİN İDEAL?

İnce kumaşlı elbise ve etek giyen kadınlar için ten rengi en güvenli seçimdir. Düğün, davet ve özel günlerde kıyafetin altından iç çamaşırı çizgisi belli etmez. Yazın beyaz veya açık pastel tonlarda giyinenler için de ten rengi görünmezlik sağlar. Ofiste ince bluz ve kumaş pantolon tercih eden profesyonel kadınlar için gün boyu güven verir.

TEKNİK ÖZELLİKLER:

• Kumaş: %95 Taranmış Penye Pamuk + %5 Elastan (Lycra)
• İç Katman: %100 Pamuk — ağ bölgesinde ekstra hijyen astarı
• Gramaj: 160–170 gr/m²
• İplik: 30/1 – 36/1 Penye İplik
• Örgü: Süprem (Single Jersey)
• Dikiş: Yüksek mukavemetli overlok tekstüre iplik
• Çekmezlik: Sanfor testi garantili
• Elastan katkısı: Esneme sonrası formuna döner, sarkma yapmaz
• Ürün Ağırlığı: ~45 gr

BEDEN REHBERİ:

• S (36-38): Bel 64–70 cm / Kalça 88–94 cm
• M (38-40): Bel 70–76 cm / Kalça 94–100 cm
• L (40-42): Bel 76–82 cm / Kalça 100–106 cm
• XL (42-44): Bel 82–88 cm / Kalça 106–112 cm
• XXL (44-46): Bel 88–94 cm / Kalça 112–118 cm
İki beden arasında kalırsanız büyük bedeni tercih edin. Bel çevrenizi en ince noktadan, kalça çevrenizi en geniş noktadan ölçün.

BAKIM TALİMATLARI:

• 30°C'de makine yıkama yapılabilir
• Çamaşır suyu kullanmayın — ten rengi solar
• Asarak kurutma önerilir
• Ütü gerektirmez
• Benzer renklerle yıkayın — koyu renklerle karıştırmayın

SIKÇA SORULAN SORULAR:

Ten rengi külot beyaz elbisenin altında görünür mü?
Ten rengi, cilt tonuna en yakın renk olduğu için beyaz ve açık renkli kıyafetlerin altında beyaz külottan bile daha az belli eder. İnce kumaşlarda en görünmez seçenektir.

Kadın külot beden seçimi nasıl yapılır?
Bel ve kalça çevrenizi ölçüp yukarıdaki tabloya bakın. Rahat kullanım için sıkıştırmayan bedeni seçin.

%100 pamuk iç katman ne işe yarar?
Ağ bölgesindeki saf pamuk astar, cildin yalnızca doğal pamukla temas etmesini sağlar. Nefes alabilirliği artırır ve hijyen güvencesi sunar.`;

  // --- KADIN KÜLOT: Ten ---
  const kadinKulotTen = await db.product.create({
    data: {
      name: "Vorte Premium Penye Kadın Külot Ten",
      slug: "kadin-modal-kulot-ten",
      description: kadinKulotTenDesc,
      seoTitle: "Vorte Premium Penye Kadın Külot Ten | Nefes Alan & Hijyenik",
      seoDescription: "%95 penye pamuk kadın külot ten rengi. %100 pamuk iç katman, ince kumaşların altında görünmez. Türkiye üretimi.",
      categoryId: catKadinKulot.id,
      gender: "KADIN",
      basePrice: 169.90,
      featured: true,
      images: [
        "/images/kadin-kulot-ten-1.png",
        "/images/kadin-kulot-ten-2.png",
        "/images/kadin-kulot-ten-3.png",
        "/images/kadin-kulot-ten-4.png",
      ],
    },
  });

  for (const size of ["S", "M", "L", "XL", "XXL"]) {
    const sku = `VRT-MKL-TEN-${size}`;
    await db.variant.create({
      data: {
        productId: kadinKulotTen.id,
        color: "Ten",
        colorHex: "#D4A574",
        size: size as "S" | "M" | "L" | "XL" | "XXL",
        sku,
        stock: 50,
        gtinBarcode: GTIN_MAP[sku],
      },
    });
  }

  console.log("  ✓ Products & variants created (6 products, 30 variants)");

  // ===== DEALER PRICES =====
  const allProducts = [erkekBoxerSiyah, erkekBoxerLacivert, erkekBoxerGri, kadinKulotSiyah, kadinKulotBeyaz, kadinKulotTen];

  for (const product of allProducts) {
    // General wholesale price (for all dealers)
    await db.dealerPrice.create({
      data: {
        productId: product.id,
        wholesalePrice: product.basePrice * 0.6, // 40% discount
        minQuantity: 10,
      },
    });

    // Special price for Shell Nilüfer
    await db.dealerPrice.create({
      data: {
        productId: product.id,
        dealerId: dealer.id,
        wholesalePrice: product.basePrice * 0.55, // 45% discount
        minQuantity: 5,
      },
    });
  }

  console.log("  ✓ Dealer prices created");

  // ===== COUPONS =====
  await db.coupon.create({
    data: {
      code: "HOSGELDIN",
      discountType: "PERCENT",
      discountValue: 10,
      minAmount: 100,
      maxUses: 1000,
      expiresAt: new Date("2026-12-31"),
    },
  });

  await db.coupon.create({
    data: {
      code: "YAZ2026",
      discountType: "FIXED",
      discountValue: 30,
      minAmount: 200,
      maxUses: 500,
      expiresAt: new Date("2026-09-01"),
    },
  });

  console.log("  ✓ Coupons created (HOSGELDIN, YAZ2026)");

  // ===== ADDRESSES =====
  await db.address.create({
    data: {
      userId: customer.id,
      title: "Ev",
      fullName: "Ahmet Yılmaz",
      phone: "0532 000 0002",
      city: "İstanbul",
      district: "Kadıköy",
      neighborhood: "Caferağa Mah.",
      address: "Moda Cad. No:15/3",
      zipCode: "34710",
      isDefault: true,
    },
  });

  console.log("  ✓ Addresses created");

  // ===== SAMPLE NOTIFICATION =====
  await db.notification.create({
    data: {
      type: "NEW_DEALER",
      title: "Yeni Bayi Başvurusu",
      message: "Shell Nilüfer İstasyonu bayilik başvurusu yapıldı.",
    },
  });

  console.log("  ✓ Notifications created");

  // ===== EMAIL TEMPLATES =====
  await db.emailTemplate.upsert({
    where: { name: "production-termin" },
    update: {},
    create: {
      name: "production-termin",
      subject: "Üretim Termin Bildirimi - #{{orderNumber}}",
      body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="text-align:center;padding:20px 0;">
    <h1 style="margin:0;font-size:24px;color:#333;font-weight:bold;">VORTE</h1>
    <p style="margin:4px 0 0;font-size:12px;color:#7AC143;letter-spacing:2px;">TEKSTİL</p>
  </div>
  <div style="background:white;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color:#333;margin:0 0 16px;">Üretim Termin Bildirimi</h2>
    <p style="color:#666;line-height:1.6;">Sayın {{companyName}},</p>
    <p style="color:#666;line-height:1.6;">#{{orderNumber}} numaralı siparişiniz için üretim termin tarihi belirlenmiştir.</p>
    <div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#92400e;">Tahmini Teslim Tarihi: <strong style="color:#78350f;font-size:16px;">{{terminDate}}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;color:#92400e;">Sipariş Tutarı: <strong>{{totalAmount}}</strong></p>
      <p style="margin:8px 0 0;font-size:13px;color:#92400e;">{{productionNote}}</p>
    </div>
    <p style="color:#666;font-size:14px;">Siparişinizi bayi panelinizden takip edebilirsiniz.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://vorte.com.tr/bayi/siparislerim" style="display:inline-block;padding:12px 32px;background:#1A1A1A;color:white;text-decoration:none;border-radius:4px;font-size:14px;font-weight:bold;">Siparişlerimi Gör</a>
    </div>
  </div>
  <div style="text-align:center;padding:20px;font-size:12px;color:#999;">
    <p>Vorte Tekstil Ticaret Ltd. Şti. | Nilüfer, Bursa</p>
  </div>
</div>
</body>
</html>`,
      fromAddress: "Vorte Bayi <bayi@vorte.com.tr>",
      active: true,
    },
  });

  await db.emailTemplate.upsert({
    where: { name: "prospect-stand-offer" },
    update: {},
    create: {
      name: "prospect-stand-offer",
      subject: "Vorte Tekstil — {{stationName}} İçin Hazır Satış Standı Teklifi",
      body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="text-align:center;padding:20px 0;">
    <h1 style="margin:0;font-size:28px;color:#333;font-weight:bold;">VORTE</h1>
    <p style="margin:4px 0 0;font-size:12px;color:#7AC143;letter-spacing:3px;">TEKSTİL</p>
  </div>
  <div style="background:white;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color:#333;margin:0 0 16px;font-size:20px;">Sayın {{contactName}},</h2>
    <p style="color:#666;line-height:1.7;font-size:15px;">
      {{stationName}} için özel hazırladığımız <strong>Hazır Satış Standı</strong> teklifimizi
      dikkatinize sunmak istiyoruz.
    </p>
    <div style="background:#f0fce8;border-left:4px solid #7AC143;padding:16px;margin:20px 0;border-radius:0 6px 6px 0;">
      <h3 style="margin:0 0 8px;color:#333;font-size:16px;">Stand Paket Seçenekleri</h3>
      <table style="width:100%;font-size:14px;color:#555;">
        <tr><td style="padding:4px 0;"><strong>Stand A (50 adet):</strong></td><td>Erkek Boxer + Kadın Külot, tek yönlü stand</td></tr>
        <tr><td style="padding:4px 0;"><strong>Stand B (100 adet):</strong></td><td>4 renk seçenek, çift yönlü stand</td></tr>
        <tr><td style="padding:4px 0;"><strong>Stand C (150 adet):</strong></td><td>Tüm renkler, tam boy 145cm stand</td></tr>
      </table>
    </div>
    <p style="color:#666;line-height:1.7;font-size:15px;">
      %95 penye pamuk, %5 elastan kumaşımızla üretilen ürünlerimiz hijyenik tekli ambalajlarda,
      karton teşhir standıyla birlikte teslim edilir. Barkod ve fiyat etiketleri hazırdır.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://www.vorte.com.tr/toptan" style="display:inline-block;padding:14px 36px;background:#7AC143;color:white;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;">
        Detaylı Bilgi ve Fiyatlar
      </a>
    </div>
    <p style="color:#666;line-height:1.7;font-size:15px;">
      Numune talebi veya detaylı bilgi için bize ulaşabilirsiniz:
    </p>
    <div style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#666;">Telefon: <strong>0850 305 86 35</strong></p>
      <p style="margin:4px 0 0;font-size:14px;color:#666;">E-posta: <strong>info@vorte.com.tr</strong></p>
      <p style="margin:4px 0 0;font-size:14px;color:#666;">Web: <strong>www.vorte.com.tr</strong></p>
    </div>
  </div>
  <div style="text-align:center;padding:20px;font-size:12px;color:#999;">
    <p>Vorte Tekstil Ticaret Ltd. Şti. | Nilüfer, Bursa</p>
    <p>Bu e-posta iş teklifi amacıyla gönderilmiştir.</p>
  </div>
</div>
</body>
</html>`,
      fromAddress: "Vorte Tekstil <info@vorte.com.tr>",
      active: true,
    },
  });

  console.log("  ✓ Email templates created");

  // ===== TESTIMONIALS =====
  const testimonials = [
    {
      name: "Mehmet K.",
      title: "Bayi, Bursa",
      rating: 5,
      comment: "Shell istasyonumuzda Vorte ürünlerini satmaya başladık, müşteri memnuniyeti çok yüksek. Kaliteli kumaş ve şık ambalaj fark yaratıyor.",
      featured: true,
      approved: true,
      sortOrder: 1,
    },
    {
      name: "Ayşe T.",
      title: "Müşteri, İstanbul",
      rating: 5,
      comment: "Penye pamuk kalitesi gerçekten fark edilir. 3 yıkamadan sonra bile yumuşaklığını koruyor, sarkmıyor. Artık başka marka almıyorum.",
      featured: true,
      approved: true,
      sortOrder: 2,
    },
    {
      name: "Ali R.",
      title: "Müşteri, Ankara",
      rating: 5,
      comment: "Beden tablosu çok doğru, tam kalıyor. Kumaşı terlemeye karşı harika, özellikle yaz aylarında büyük rahatlık sağlıyor.",
      featured: true,
      approved: true,
      sortOrder: 3,
    },
    {
      name: "Fatma S.",
      title: "Müşteri, İzmir",
      rating: 4,
      comment: "Ten rengi külot beyaz kıyafetlerin altında gerçekten görünmüyor. Pamuk iç katman da hijyen açısından güven veriyor.",
      featured: true,
      approved: true,
      sortOrder: 4,
    },
    {
      name: "Hasan D.",
      title: "Bayi, Eskişehir",
      rating: 5,
      comment: "Toptan sipariş süreci çok kolay, bayi paneli kullanışlı. Kargo hızlı geliyor, ürün kalitesi tutarlı. Tavsiye ederim.",
      featured: true,
      approved: true,
      sortOrder: 5,
    },
    {
      name: "Zeynep A.",
      title: "Müşteri, Bursa",
      rating: 5,
      comment: "Lastik iz bırakmıyor, dikiş yerleri kaşıntı yapmıyor. Günlük kullanım için mükemmel bir iç çamaşırı. Fiyat-performans oranı çok iyi.",
      featured: true,
      approved: true,
      sortOrder: 6,
    },
  ];

  for (const t of testimonials) {
    await db.testimonial.create({ data: t });
  }

  console.log("  ✓ Testimonials created (6 adet)");

  // ===== GIFT CARDS =====
  await db.giftCard.create({
    data: {
      code: "HEDIYE100",
      initialAmount: 100,
      balance: 100,
      senderName: "Vorte Tekstil",
      recipientName: "Demo Kullanıcı",
      message: "Hoş geldiniz hediyesi!",
      active: true,
      expiresAt: new Date("2026-12-31"),
    },
  });

  await db.giftCard.create({
    data: {
      code: "DOGUMGUNU50",
      initialAmount: 50,
      balance: 50,
      senderName: "Vorte Tekstil",
      recipientEmail: "musteri@test.com",
      message: "Doğum gününüz kutlu olsun!",
      active: true,
      expiresAt: new Date("2026-06-30"),
    },
  });

  console.log("  ✓ Gift cards created (HEDIYE100, DOGUMGUNU50)");

  console.log("\n✅ Seed completed!");
  console.log("\n📋 Test Credentials:");
  console.log("  Admin:    admin@vorte.com.tr / 123456");
  console.log("  Customer: musteri@test.com / 123456");
  console.log("  Dealer:   BAY-SHELL01 / 123456");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
