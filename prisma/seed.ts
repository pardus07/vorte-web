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

  const catErkekAtlet = await db.category.create({
    data: { name: "Erkek Atlet", slug: "erkek-atlet", gender: "ERKEK", sortOrder: 2 },
  });

  const catKadinKulot = await db.category.create({
    data: { name: "Kadın Külot", slug: "kadin-kulot", gender: "KADIN", sortOrder: 1 },
  });

  const catKadinSutyen = await db.category.create({
    data: { name: "Kadın Sütyen", slug: "kadin-sutyen", gender: "KADIN", sortOrder: 2 },
  });

  console.log("  ✓ Categories created");

  // ===== PRODUCTS & VARIANTS =====

  // Erkek Boxer 1 - Premium Siyah/Lacivert
  const boxer1 = await db.product.create({
    data: {
      name: "Vorte Premium Erkek Boxer",
      slug: "vorte-premium-erkek-boxer",
      description: "Premium pamuk kumaş, elastik bel bandı, konforlu kesim. Günlük kullanıma uygun kaliteli erkek boxer.",
      categoryId: catErkekBoxer.id,
      gender: "ERKEK",
      basePrice: 89.90,
      featured: true,
      images: ["/images/erkek-boxer-siyah-1.png", "/images/erkek-boxer-siyah-2.png", "/images/erkek-boxer-siyah-3.png", "/images/erkek-boxer-siyah-4.png"],
    },
  });

  // Siyah variants
  for (const size of ["S", "M", "L", "XL", "XXL"]) {
    await db.variant.create({
      data: {
        productId: boxer1.id,
        color: "Siyah",
        colorHex: "#1A1A1A",
        size: size as "S" | "M" | "L" | "XL" | "XXL",
        sku: `VRT-BXR-SYH-${size}`,
        gtinBarcode: `869000100${size === "S" ? "1" : size === "M" ? "2" : size === "L" ? "3" : size === "XL" ? "4" : "5"}001`,
        stock: size === "M" || size === "L" ? 50 : size === "XL" ? 30 : 20,
      },
    });
  }

  // Lacivert variants
  for (const size of ["S", "M", "L", "XL", "XXL"]) {
    await db.variant.create({
      data: {
        productId: boxer1.id,
        color: "Lacivert",
        colorHex: "#1B2A4A",
        size: size as "S" | "M" | "L" | "XL" | "XXL",
        sku: `VRT-BXR-LCV-${size}`,
        gtinBarcode: `869000100${size === "S" ? "1" : size === "M" ? "2" : size === "L" ? "3" : size === "XL" ? "4" : "5"}002`,
        stock: size === "M" || size === "L" ? 45 : 15,
      },
    });
  }

  // Erkek Boxer 2 - Comfort
  const boxer2 = await db.product.create({
    data: {
      name: "Vorte Comfort Erkek Boxer",
      slug: "vorte-comfort-erkek-boxer",
      description: "Yumuşak modal kumaş, dikişsiz tasarım. Tüm gün konfor sunan erkek boxer.",
      categoryId: catErkekBoxer.id,
      gender: "ERKEK",
      basePrice: 69.90,
      featured: false,
      images: ["/images/erkek-boxer-lacivert-1.png", "/images/erkek-boxer-lacivert-2.png", "/images/erkek-boxer-lacivert-3.png", "/images/erkek-boxer-lacivert-4.png"],
    },
  });

  for (const color of [
    { name: "Gri", hex: "#808080" },
    { name: "Bordo", hex: "#800020" },
  ]) {
    for (const size of ["S", "M", "L", "XL", "XXL"]) {
      const prefix = color.name === "Gri" ? "GRI" : "BRD";
      await db.variant.create({
        data: {
          productId: boxer2.id,
          color: color.name,
          colorHex: color.hex,
          size: size as "S" | "M" | "L" | "XL" | "XXL",
          sku: `VRT-CMF-${prefix}-${size}`,
          stock: Math.floor(Math.random() * 40) + 10,
        },
      });
    }
  }

  // Erkek Boxer 3 - Sport
  const boxer3 = await db.product.create({
    data: {
      name: "Vorte Sport Erkek Boxer",
      slug: "vorte-sport-erkek-boxer",
      description: "Nefes alabilir kumaş, spor aktiviteler için ideal. Ter tutmaz yapı.",
      categoryId: catErkekBoxer.id,
      gender: "ERKEK",
      basePrice: 99.90,
      featured: true,
      images: ["/images/erkek-boxer-siyah-1.png", "/images/erkek-boxer-siyah-4.png"],
    },
  });

  for (const size of ["S", "M", "L", "XL", "XXL"]) {
    await db.variant.create({
      data: {
        productId: boxer3.id,
        color: "Siyah",
        colorHex: "#1A1A1A",
        size: size as "S" | "M" | "L" | "XL" | "XXL",
        sku: `VRT-SPR-SYH-${size}`,
        stock: Math.floor(Math.random() * 30) + 5,
      },
    });
  }

  // Erkek Atlet
  const atlet1 = await db.product.create({
    data: {
      name: "Vorte Classic Erkek Atlet",
      slug: "vorte-classic-erkek-atlet",
      description: "%100 pamuk, klasik kesim erkek atlet. Günlük kullanıma ideal.",
      categoryId: catErkekAtlet.id,
      gender: "ERKEK",
      basePrice: 59.90,
      images: ["/images/erkek-boxer-lacivert-1.png", "/images/erkek-boxer-lacivert-4.png"],
    },
  });

  for (const color of [
    { name: "Beyaz", hex: "#FFFFFF" },
    { name: "Siyah", hex: "#1A1A1A" },
  ]) {
    for (const size of ["S", "M", "L", "XL", "XXL"]) {
      const prefix = color.name === "Beyaz" ? "BYZ" : "SYH";
      await db.variant.create({
        data: {
          productId: atlet1.id,
          color: color.name,
          colorHex: color.hex,
          size: size as "S" | "M" | "L" | "XL" | "XXL",
          sku: `VRT-ATL-${prefix}-${size}`,
          stock: Math.floor(Math.random() * 60) + 10,
        },
      });
    }
  }

  // Kadın Külot 1 - Premium
  const kulot1 = await db.product.create({
    data: {
      name: "Vorte Premium Kadın Külot",
      slug: "vorte-premium-kadin-kulot",
      description: "Yumuşak pamuk kumaş, dantel detaylı. Zarif ve konforlu kadın külot.",
      categoryId: catKadinKulot.id,
      gender: "KADIN",
      basePrice: 59.90,
      featured: true,
      images: ["/images/kadin-kulot-siyah-1.png", "/images/kadin-kulot-siyah-2.png", "/images/kadin-kulot-siyah-3.png", "/images/kadin-kulot-siyah-4.png"],
    },
  });

  for (const color of [
    { name: "Pembe", hex: "#EC4899" },
    { name: "Beyaz", hex: "#FFFFFF" },
    { name: "Siyah", hex: "#1A1A1A" },
  ]) {
    for (const size of ["S", "M", "L", "XL", "XXL"]) {
      const prefix = color.name === "Pembe" ? "PMB" : color.name === "Beyaz" ? "BYZ" : "SYH";
      await db.variant.create({
        data: {
          productId: kulot1.id,
          color: color.name,
          colorHex: color.hex,
          size: size as "S" | "M" | "L" | "XL" | "XXL",
          sku: `VRT-KLT-${prefix}-${size}`,
          gtinBarcode: `869000200${size === "S" ? "1" : size === "M" ? "2" : size === "L" ? "3" : size === "XL" ? "4" : "5"}00${color.name === "Pembe" ? "1" : color.name === "Beyaz" ? "2" : "3"}`,
          stock: Math.floor(Math.random() * 50) + 10,
        },
      });
    }
  }

  // Kadın Külot 2 - Comfort
  const kulot2 = await db.product.create({
    data: {
      name: "Vorte Comfort Kadın Külot",
      slug: "vorte-comfort-kadin-kulot",
      description: "Dikişsiz tasarım, gün boyu konfor. Modal kumaş ile yumuşak dokunuş.",
      categoryId: catKadinKulot.id,
      gender: "KADIN",
      basePrice: 49.90,
      images: ["/images/kadin-kulot-beyaz-1.png", "/images/kadin-kulot-beyaz-2.png", "/images/kadin-kulot-beyaz-3.png", "/images/kadin-kulot-beyaz-4.png"],
    },
  });

  for (const color of [
    { name: "Bej", hex: "#D4B896" },
    { name: "Gri", hex: "#808080" },
    { name: "Pembe", hex: "#F9A8D4" },
  ]) {
    for (const size of ["S", "M", "L", "XL", "XXL"]) {
      const prefix = color.name === "Bej" ? "BEJ" : color.name === "Gri" ? "GRI" : "PMB";
      await db.variant.create({
        data: {
          productId: kulot2.id,
          color: color.name,
          colorHex: color.hex,
          size: size as "S" | "M" | "L" | "XL" | "XXL",
          sku: `VRT-CMF-K-${prefix}-${size}`,
          stock: Math.floor(Math.random() * 40) + 5,
        },
      });
    }
  }

  // Kadın Külot 3 - Sport
  const kulot3 = await db.product.create({
    data: {
      name: "Vorte Sport Kadın Külot",
      slug: "vorte-sport-kadin-kulot",
      description: "Spor kesim, nefes alabilir kumaş. Aktif yaşam için tasarlandı.",
      categoryId: catKadinKulot.id,
      gender: "KADIN",
      basePrice: 69.90,
      featured: true,
      images: ["/images/kadin-kulot-ten-1.png", "/images/kadin-kulot-ten-2.png", "/images/kadin-kulot-ten-3.png", "/images/kadin-kulot-ten-4.png"],
    },
  });

  for (const color of [
    { name: "Siyah", hex: "#1A1A1A" },
    { name: "Beyaz", hex: "#FFFFFF" },
    { name: "Pembe", hex: "#EC4899" },
  ]) {
    for (const size of ["S", "M", "L", "XL", "XXL"]) {
      const prefix = color.name === "Siyah" ? "SYH" : color.name === "Beyaz" ? "BYZ" : "PMB";
      await db.variant.create({
        data: {
          productId: kulot3.id,
          color: color.name,
          colorHex: color.hex,
          size: size as "S" | "M" | "L" | "XL" | "XXL",
          sku: `VRT-SPR-K-${prefix}-${size}`,
          stock: size === "XXL" ? 2 : Math.floor(Math.random() * 35) + 5,
        },
      });
    }
  }

  console.log("  ✓ Products & variants created (7 products, 85 variants)");

  // ===== DEALER PRICES =====
  const allProducts = [boxer1, boxer2, boxer3, atlet1, kulot1, kulot2, kulot3];

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
