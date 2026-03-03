import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
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

  // --- ERKEK BOXER: Siyah ---
  const erkekBoxerSiyah = await db.product.create({
    data: {
      name: "Erkek Modal Boxer Siyah",
      slug: "erkek-modal-boxer-siyah",
      description: "Premium modal kumaş, elastik bel bandı, konforlu kesim. Günlük kullanıma uygun kaliteli erkek boxer. Siyah renk.",
      categoryId: catErkekBoxer.id,
      gender: "ERKEK",
      basePrice: 149.90,
      featured: true,
      images: [
        "/images/erkek-boxer-siyah-1.png",
        "/images/erkek-boxer-siyah-2.png",
        "/images/erkek-boxer-siyah-3.png",
        "/images/erkek-boxer-siyah-4.png",
      ],
    },
  });

  for (const size of ["S", "M", "L", "XL", "XXL"]) {
    await db.variant.create({
      data: {
        productId: erkekBoxerSiyah.id,
        color: "Siyah",
        colorHex: "#000000",
        size: size as "S" | "M" | "L" | "XL" | "XXL",
        sku: `VRT-MBX-SYH-${size}`,
        stock: 50,
      },
    });
  }

  // --- ERKEK BOXER: Lacivert ---
  const erkekBoxerLacivert = await db.product.create({
    data: {
      name: "Erkek Modal Boxer Lacivert",
      slug: "erkek-modal-boxer-lacivert",
      description: "Premium modal kumaş, elastik bel bandı, konforlu kesim. Günlük kullanıma uygun kaliteli erkek boxer. Lacivert renk.",
      categoryId: catErkekBoxer.id,
      gender: "ERKEK",
      basePrice: 149.90,
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
    await db.variant.create({
      data: {
        productId: erkekBoxerLacivert.id,
        color: "Lacivert",
        colorHex: "#1B2A4A",
        size: size as "S" | "M" | "L" | "XL" | "XXL",
        sku: `VRT-MBX-LCV-${size}`,
        stock: 50,
      },
    });
  }

  // --- KADIN KÜLOT: Siyah ---
  const kadinKulotSiyah = await db.product.create({
    data: {
      name: "Kadın Modal Külot Siyah",
      slug: "kadin-modal-kulot-siyah",
      description: "Yumuşak modal kumaş, zarif ve konforlu kadın külot. Günlük kullanıma ideal. Siyah renk.",
      categoryId: catKadinKulot.id,
      gender: "KADIN",
      basePrice: 99.90,
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
    await db.variant.create({
      data: {
        productId: kadinKulotSiyah.id,
        color: "Siyah",
        colorHex: "#000000",
        size: size as "S" | "M" | "L" | "XL" | "XXL",
        sku: `VRT-MKL-SYH-${size}`,
        stock: 50,
      },
    });
  }

  // --- KADIN KÜLOT: Beyaz ---
  const kadinKulotBeyaz = await db.product.create({
    data: {
      name: "Kadın Modal Külot Beyaz",
      slug: "kadin-modal-kulot-beyaz",
      description: "Yumuşak modal kumaş, zarif ve konforlu kadın külot. Günlük kullanıma ideal. Beyaz renk.",
      categoryId: catKadinKulot.id,
      gender: "KADIN",
      basePrice: 99.90,
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
    await db.variant.create({
      data: {
        productId: kadinKulotBeyaz.id,
        color: "Beyaz",
        colorHex: "#FFFFFF",
        size: size as "S" | "M" | "L" | "XL" | "XXL",
        sku: `VRT-MKL-BYZ-${size}`,
        stock: 50,
      },
    });
  }

  // --- KADIN KÜLOT: Ten ---
  const kadinKulotTen = await db.product.create({
    data: {
      name: "Kadın Modal Külot Ten",
      slug: "kadin-modal-kulot-ten",
      description: "Yumuşak modal kumaş, zarif ve konforlu kadın külot. Günlük kullanıma ideal. Ten rengi.",
      categoryId: catKadinKulot.id,
      gender: "KADIN",
      basePrice: 99.90,
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
    await db.variant.create({
      data: {
        productId: kadinKulotTen.id,
        color: "Ten",
        colorHex: "#D4A574",
        size: size as "S" | "M" | "L" | "XL" | "XXL",
        sku: `VRT-MKL-TEN-${size}`,
        stock: 50,
      },
    });
  }

  console.log("  ✓ Products & variants created (5 products, 25 variants)");

  // ===== DEALER PRICES =====
  const allProducts = [erkekBoxerSiyah, erkekBoxerLacivert, kadinKulotSiyah, kadinKulotBeyaz, kadinKulotTen];

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
