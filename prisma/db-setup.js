// Database Setup Script - Creates tables and seeds data
// Run inside container: node prisma/db-setup.js
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();
const PASSWORD_HASH = "$2b$12$TqXDoMJfzG18Ilj3Idvp6OYYYmkk/5JIo4wtgSFxRneOuZliPFooS"; // 123456

async function createSchema() {
  console.log("📦 Creating database schema...");

  const statements = [
    // Enums
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DealerStatus') THEN CREATE TYPE "DealerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Gender') THEN CREATE TYPE "Gender" AS ENUM ('ERKEK', 'KADIN'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Size') THEN CREATE TYPE "Size" AS ENUM ('S', 'M', 'L', 'XL', 'XXL'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderType') THEN CREATE TYPE "OrderType" AS ENUM ('RETAIL', 'WHOLESALE'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceType') THEN CREATE TYPE "InvoiceType" AS ENUM ('EFATURA', 'EARSIV'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceStatus') THEN CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'CREATED', 'SENT', 'ERROR'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiscountType') THEN CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN CREATE TYPE "NotificationType" AS ENUM ('NEW_ORDER', 'DEALER_ORDER', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'STOCK_ALERT', 'NEW_DEALER'); END IF; END $$`,

    // Tables
    `CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "email" TEXT NOT NULL,
      "name" TEXT,
      "phone" TEXT,
      "passwordHash" TEXT NOT NULL,
      "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
      "emailVerified" TIMESTAMP(3),
      "image" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "users_pkey" PRIMARY KEY ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "dealers" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "companyName" TEXT NOT NULL,
      "taxNumber" TEXT NOT NULL,
      "taxOffice" TEXT NOT NULL,
      "dealerCode" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "contactName" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "city" TEXT NOT NULL,
      "district" TEXT NOT NULL,
      "address" TEXT NOT NULL,
      "status" "DealerStatus" NOT NULL DEFAULT 'PENDING',
      "approvedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "dealers_pkey" PRIMARY KEY ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "addresses" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "userId" TEXT,
      "dealerId" TEXT,
      "title" TEXT NOT NULL,
      "fullName" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "city" TEXT NOT NULL,
      "district" TEXT NOT NULL,
      "neighborhood" TEXT,
      "address" TEXT NOT NULL,
      "zipCode" TEXT,
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "categories" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "image" TEXT,
      "gender" "Gender" NOT NULL,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "products" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "description" TEXT,
      "categoryId" TEXT NOT NULL,
      "gender" "Gender" NOT NULL,
      "basePrice" DOUBLE PRECISION NOT NULL,
      "images" TEXT[],
      "active" BOOLEAN NOT NULL DEFAULT true,
      "featured" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "products_pkey" PRIMARY KEY ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "variants" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "productId" TEXT NOT NULL,
      "color" TEXT NOT NULL,
      "colorHex" TEXT NOT NULL,
      "size" "Size" NOT NULL,
      "sku" TEXT NOT NULL,
      "gtinBarcode" TEXT,
      "stock" INTEGER NOT NULL DEFAULT 0,
      "price" DOUBLE PRECISION,
      "active" BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "dealer_prices" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "productId" TEXT NOT NULL,
      "dealerId" TEXT,
      "wholesalePrice" DOUBLE PRECISION NOT NULL,
      "minQuantity" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "dealer_prices_pkey" PRIMARY KEY ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "orders" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "orderNumber" TEXT NOT NULL,
      "userId" TEXT,
      "dealerId" TEXT,
      "type" "OrderType" NOT NULL,
      "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
      "totalAmount" DOUBLE PRECISION NOT NULL,
      "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "addressSnapshot" JSONB NOT NULL,
      "cargoTrackingNo" TEXT,
      "cargoProvider" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "order_items" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "orderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "variantId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "unitPrice" DOUBLE PRECISION NOT NULL,
      "totalPrice" DOUBLE PRECISION NOT NULL,
      "productSnapshot" JSONB NOT NULL,
      CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "payments" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "orderId" TEXT NOT NULL,
      "iyzicoPaymentId" TEXT,
      "iyzicoConversationId" TEXT,
      "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
      "amount" DOUBLE PRECISION NOT NULL,
      "paidAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "invoices" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "orderId" TEXT NOT NULL,
      "diaInvoiceId" TEXT,
      "invoiceNo" TEXT,
      "invoiceType" "InvoiceType",
      "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
      "pdfUrl" TEXT,
      "sentAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "coupons" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "code" TEXT NOT NULL,
      "discountType" "DiscountType" NOT NULL,
      "discountValue" DOUBLE PRECISION NOT NULL,
      "minAmount" DOUBLE PRECISION,
      "maxUses" INTEGER,
      "currentUses" INTEGER NOT NULL DEFAULT 0,
      "expiresAt" TIMESTAMP(3),
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "favorites" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "userId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "cart_items" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "sessionId" TEXT,
      "userId" TEXT,
      "dealerId" TEXT,
      "productId" TEXT NOT NULL,
      "variantId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "notifications" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "type" "NotificationType" NOT NULL,
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "orderId" TEXT,
      "isRead" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
    )`,

    // Unique indexes
    `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "dealers_taxNumber_key" ON "dealers"("taxNumber")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "dealers_dealerCode_key" ON "dealers"("dealerCode")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "dealers_email_key" ON "dealers"("email")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_key" ON "categories"("slug")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "products_slug_key" ON "products"("slug")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "variants_sku_key" ON "variants"("sku")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "variants_gtinBarcode_key" ON "variants"("gtinBarcode")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "variants_productId_color_size_key" ON "variants"("productId", "color", "size")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "dealer_prices_productId_dealerId_key" ON "dealer_prices"("productId", "dealerId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "orders_orderNumber_key" ON "orders"("orderNumber")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "payments_orderId_key" ON "payments"("orderId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "invoices_orderId_key" ON "invoices"("orderId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_key" ON "coupons"("code")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "favorites_userId_productId_key" ON "favorites"("userId", "productId")`,

    // Foreign keys (use DO block to handle IF NOT EXISTS)
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'addresses_userId_fkey') THEN ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'addresses_dealerId_fkey') THEN ALTER TABLE "addresses" ADD CONSTRAINT "addresses_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_categoryId_fkey') THEN ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'variants_productId_fkey') THEN ALTER TABLE "variants" ADD CONSTRAINT "variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dealer_prices_productId_fkey') THEN ALTER TABLE "dealer_prices" ADD CONSTRAINT "dealer_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dealer_prices_dealerId_fkey') THEN ALTER TABLE "dealer_prices" ADD CONSTRAINT "dealer_prices_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_userId_fkey') THEN ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_dealerId_fkey') THEN ALTER TABLE "orders" ADD CONSTRAINT "orders_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_orderId_fkey') THEN ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_productId_fkey') THEN ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_variantId_fkey') THEN ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_orderId_fkey') THEN ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_orderId_fkey') THEN ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favorites_userId_fkey') THEN ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favorites_productId_fkey') THEN ALTER TABLE "favorites" ADD CONSTRAINT "favorites_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_userId_fkey') THEN ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_dealerId_fkey') THEN ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_productId_fkey') THEN ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_variantId_fkey') THEN ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,

    // SiteSettings table
    `CREATE TABLE IF NOT EXISTS "site_settings" (
      "id" TEXT NOT NULL DEFAULT 'main',
      "siteName" TEXT NOT NULL DEFAULT 'Vorte Tekstil',
      "siteDescription" TEXT,
      "siteUrl" TEXT NOT NULL DEFAULT 'https://www.vorte.com.tr',
      "contactEmail" TEXT,
      "contactPhone" TEXT,
      "contactAddress" TEXT,
      "logoUrl" TEXT,
      "logoDarkUrl" TEXT,
      "faviconUrl" TEXT,
      "ogImageUrl" TEXT,
      "metaTitle" TEXT,
      "metaDescription" TEXT,
      "metaKeywords" TEXT,
      "googleVerificationCode" TEXT,
      "googleAnalyticsId" TEXT,
      "googleAdsCode" TEXT,
      "googleMerchantId" TEXT,
      "facebookPixelId" TEXT,
      "aiSystemPrompt" TEXT,
      "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
      "aiRules" TEXT,
      "instagramUrl" TEXT,
      "facebookUrl" TEXT,
      "twitterUrl" TEXT,
      "tiktokUrl" TEXT,
      "youtubeUrl" TEXT,
      "smtpHost" TEXT,
      "smtpPort" INTEGER,
      "smtpUser" TEXT,
      "smtpPassword" TEXT,
      "freeShippingThreshold" DOUBLE PRECISION,
      "defaultShippingCost" DOUBLE PRECISION,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
    )`,

    // User new columns (Faz 11)
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" JSONB`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)`,

    // UserRole enum update (Faz 11)
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EDITOR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN ALTER TYPE "UserRole" ADD VALUE 'EDITOR'; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VIEWER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN ALTER TYPE "UserRole" ADD VALUE 'VIEWER'; END IF; END $$`,

    // Activity Logs table (Faz 11)
    `CREATE TABLE IF NOT EXISTS "activity_logs" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "userId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "target" TEXT,
      "details" TEXT,
      "ip" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_logs_userId_fkey') THEN ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,

    // Product new columns (Faz 2)
    `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "costPrice" DOUBLE PRECISION`,
    `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION`,
    `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT`,
    `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "seoDescription" TEXT`,
    `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "googleCategory" TEXT`,
    `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "merchantSynced" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "merchantSyncedAt" TIMESTAMP(3)`,

    // Sliders table (Faz 3)
    `CREATE TABLE IF NOT EXISTS "sliders" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "title" TEXT,
      "subtitle" TEXT,
      "highlight" TEXT,
      "description" TEXT,
      "buttonText" TEXT,
      "buttonLink" TEXT,
      "secondaryButtonText" TEXT,
      "secondaryButtonLink" TEXT,
      "imageDesktop" TEXT NOT NULL,
      "imageMobile" TEXT NOT NULL,
      "altText" TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "startDate" TIMESTAMP(3),
      "endDate" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "sliders_pkey" PRIMARY KEY ("id")
    )`,

    // Banners table (Faz 3)
    `CREATE TABLE IF NOT EXISTS "banners" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "name" TEXT NOT NULL,
      "position" TEXT NOT NULL,
      "imageDesktop" TEXT NOT NULL,
      "imageMobile" TEXT,
      "link" TEXT,
      "altText" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "startDate" TIMESTAMP(3),
      "endDate" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
    )`,

    // Prisma migrations table
    `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
    )`,
  ];

  for (let i = 0; i < statements.length; i++) {
    try {
      await db.$executeRawUnsafe(statements[i]);
    } catch (err) {
      console.error(`  ⚠ Statement ${i + 1} failed:`, err.message);
    }
  }

  console.log("  ✓ Schema created successfully");
}

async function seedData() {
  console.log("\n🌱 Seeding database...");

  // Clean existing data (order matters for FK constraints)
  const tables = [
    "notifications", "cart_items", "favorites", "order_items",
    "payments", "invoices", "orders", "dealer_prices",
    "variants", "products", "categories", "coupons",
    "addresses", "dealers", "users"
  ];
  for (const table of tables) {
    try {
      await db.$executeRawUnsafe(`DELETE FROM "${table}"`);
    } catch (e) {
      // Table might not exist yet
    }
  }
  console.log("  ✓ Cleaned existing data");

  // ===== USERS =====
  const admin = await db.user.create({
    data: {
      email: "admin@vorte.com.tr",
      name: "Admin Kullanıcı",
      phone: "0532 000 0001",
      passwordHash: PASSWORD_HASH,
      role: "ADMIN",
    },
  });

  const customer = await db.user.create({
    data: {
      email: "musteri@test.com",
      name: "Ahmet Yılmaz",
      phone: "0532 000 0002",
      passwordHash: PASSWORD_HASH,
      role: "CUSTOMER",
    },
  });
  console.log("  ✓ Users created");

  // ===== DEALERS =====
  const dealer = await db.dealer.create({
    data: {
      companyName: "Shell Nilüfer İstasyonu",
      taxNumber: "1234567890",
      taxOffice: "Nilüfer V.D.",
      dealerCode: "BAY-SHELL01",
      passwordHash: PASSWORD_HASH,
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

  await db.dealer.create({
    data: {
      companyName: "Shell Osmangazi İstasyonu",
      taxNumber: "0987654321",
      taxOffice: "Osmangazi V.D.",
      dealerCode: "BAY-SHELL02",
      passwordHash: PASSWORD_HASH,
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
  console.log("  ✓ Dealers created");

  // ===== CATEGORIES =====
  const catErkekBoxer = await db.category.create({
    data: { name: "Erkek Boxer", slug: "erkek-boxer", gender: "ERKEK", sortOrder: 1 },
  });

  const catKadinKulot = await db.category.create({
    data: { name: "Kadın Külot", slug: "kadin-kulot", gender: "KADIN", sortOrder: 1 },
  });
  console.log("  ✓ Categories created");

  // ===== PRODUCTS & VARIANTS =====
  const productDefs = [
    {
      name: "Erkek Modal Boxer Siyah",
      slug: "erkek-modal-boxer-siyah",
      description: "Premium modal kumaş, elastik bel bandı, konforlu kesim. Günlük kullanıma uygun kaliteli erkek boxer. Siyah renk.",
      categoryId: catErkekBoxer.id,
      gender: "ERKEK",
      basePrice: 149.90,
      images: ["/images/erkek-boxer-siyah-1.png", "/images/erkek-boxer-siyah-2.png", "/images/erkek-boxer-siyah-3.png", "/images/erkek-boxer-siyah-4.png"],
      color: "Siyah",
      colorHex: "#000000",
      skuPrefix: "VRT-MBX-SYH",
    },
    {
      name: "Erkek Modal Boxer Lacivert",
      slug: "erkek-modal-boxer-lacivert",
      description: "Premium modal kumaş, elastik bel bandı, konforlu kesim. Günlük kullanıma uygun kaliteli erkek boxer. Lacivert renk.",
      categoryId: catErkekBoxer.id,
      gender: "ERKEK",
      basePrice: 149.90,
      images: ["/images/erkek-boxer-lacivert-1.png", "/images/erkek-boxer-lacivert-2.png", "/images/erkek-boxer-lacivert-3.png", "/images/erkek-boxer-lacivert-4.png"],
      color: "Lacivert",
      colorHex: "#1B2A4A",
      skuPrefix: "VRT-MBX-LCV",
    },
    {
      name: "Kadın Modal Külot Siyah",
      slug: "kadin-modal-kulot-siyah",
      description: "Yumuşak modal kumaş, zarif ve konforlu kadın külot. Günlük kullanıma ideal. Siyah renk.",
      categoryId: catKadinKulot.id,
      gender: "KADIN",
      basePrice: 99.90,
      images: ["/images/kadin-kulot-siyah-1.png", "/images/kadin-kulot-siyah-2.png", "/images/kadin-kulot-siyah-3.png", "/images/kadin-kulot-siyah-4.png"],
      color: "Siyah",
      colorHex: "#000000",
      skuPrefix: "VRT-MKL-SYH",
    },
    {
      name: "Kadın Modal Külot Beyaz",
      slug: "kadin-modal-kulot-beyaz",
      description: "Yumuşak modal kumaş, zarif ve konforlu kadın külot. Günlük kullanıma ideal. Beyaz renk.",
      categoryId: catKadinKulot.id,
      gender: "KADIN",
      basePrice: 99.90,
      images: ["/images/kadin-kulot-beyaz-1.png", "/images/kadin-kulot-beyaz-2.png", "/images/kadin-kulot-beyaz-3.png", "/images/kadin-kulot-beyaz-4.png"],
      color: "Beyaz",
      colorHex: "#FFFFFF",
      skuPrefix: "VRT-MKL-BYZ",
    },
    {
      name: "Kadın Modal Külot Ten",
      slug: "kadin-modal-kulot-ten",
      description: "Yumuşak modal kumaş, zarif ve konforlu kadın külot. Günlük kullanıma ideal. Ten rengi.",
      categoryId: catKadinKulot.id,
      gender: "KADIN",
      basePrice: 99.90,
      images: ["/images/kadin-kulot-ten-1.png", "/images/kadin-kulot-ten-2.png", "/images/kadin-kulot-ten-3.png", "/images/kadin-kulot-ten-4.png"],
      color: "Ten",
      colorHex: "#D4A574",
      skuPrefix: "VRT-MKL-TEN",
    },
  ];

  const createdProducts = [];
  const sizes = ["S", "M", "L", "XL", "XXL"];

  for (const def of productDefs) {
    const product = await db.product.create({
      data: {
        name: def.name,
        slug: def.slug,
        description: def.description,
        categoryId: def.categoryId,
        gender: def.gender,
        basePrice: def.basePrice,
        featured: true,
        images: def.images,
      },
    });

    for (const size of sizes) {
      await db.variant.create({
        data: {
          productId: product.id,
          color: def.color,
          colorHex: def.colorHex,
          size: size,
          sku: `${def.skuPrefix}-${size}`,
          stock: 50,
        },
      });
    }

    createdProducts.push(product);
  }
  console.log("  ✓ Products & variants created (5 products, 25 variants)");

  // ===== DEALER PRICES =====
  for (const product of createdProducts) {
    await db.dealerPrice.create({
      data: {
        productId: product.id,
        wholesalePrice: product.basePrice * 0.6,
        minQuantity: 10,
      },
    });
    await db.dealerPrice.create({
      data: {
        productId: product.id,
        dealerId: dealer.id,
        wholesalePrice: product.basePrice * 0.55,
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
  console.log("  ✓ Coupons created");

  // ===== ADDRESS =====
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

  // ===== NOTIFICATION =====
  await db.notification.create({
    data: {
      type: "NEW_DEALER",
      title: "Yeni Bayi Başvurusu",
      message: "Shell Nilüfer İstasyonu bayilik başvurusu yapıldı.",
    },
  });
  console.log("  ✓ Notifications created");

  // ===== SITE SETTINGS =====
  await db.siteSettings.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      siteName: "Vorte Tekstil",
      siteUrl: "https://www.vorte.com.tr",
      contactEmail: "info@vorte.com.tr",
      contactPhone: "+90 537 622 0694",
      contactAddress: "Dumlupınar Mah., Kayabaşı Sok., 17BG, Nilüfer/Bursa",
      freeShippingThreshold: 200,
      defaultShippingCost: 39.90,
    },
  });
  console.log("  ✓ Site settings created");

  console.log("\n✅ Seed completed!");
  console.log("\n📋 Test Credentials:");
  console.log("  Admin:    admin@vorte.com.tr / 123456");
  console.log("  Customer: musteri@test.com / 123456");
  console.log("  Dealer:   BAY-SHELL01 / 123456");
}

async function main() {
  try {
    await createSchema();
    await seedData();
  } catch (err) {
    console.error("❌ Setup failed:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
