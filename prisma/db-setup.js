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

    // AI Model column (Faz 17)
    `ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "aiModel" TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001'`,

    // Coupon new columns (Faz 12)
    `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "name" TEXT`,
    `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "maxUsesPerUser" INTEGER`,
    `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP(3)`,
    `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "campaignType" TEXT NOT NULL DEFAULT 'general'`,
    `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "freeShipping" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "buyQuantity" INTEGER`,
    `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "getQuantity" INTEGER`,
    `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "orderScope" TEXT NOT NULL DEFAULT 'all'`,
    `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "applicableProducts" TEXT`,
    `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "applicableCategories" TEXT`,
    `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "description" TEXT`,

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
      "aiModel" TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
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

    // Order new columns (Faz 4)
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cargoShipmentId" TEXT`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "couponCode" TEXT`,

    // Order Status History table (Faz 4)
    `CREATE TABLE IF NOT EXISTS "order_status_history" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "orderId" TEXT NOT NULL,
      "fromStatus" TEXT,
      "toStatus" TEXT NOT NULL,
      "note" TEXT,
      "changedBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_status_history_orderId_fkey') THEN ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,

    // Invoice new columns (Faz 5)
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoiceSeries" TEXT NOT NULL DEFAULT 'VRT'`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "totalAmount" DOUBLE PRECISION`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "taxAmount" DOUBLE PRECISION`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "issuedAt" TIMESTAMP(3)`,

    // ProductCost table (Faz 5)
    `CREATE TABLE IF NOT EXISTS "product_costs" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "productId" TEXT NOT NULL,
      "materialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "overheadCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "packagingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "notes" TEXT,
      "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "product_costs_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_costs_productId_fkey') THEN ALTER TABLE "product_costs" ADD CONSTRAINT "product_costs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,

    // DailyReport table (Faz 5)
    `CREATE TABLE IF NOT EXISTS "daily_reports" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "date" TIMESTAMP(3) NOT NULL,
      "totalOrders" INTEGER NOT NULL DEFAULT 0,
      "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "orderBreakdown" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "daily_reports_date_key" UNIQUE ("date")
    )`,

    // Dealer new columns (Faz 6)
    `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "shopAddress" TEXT`,
    `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "shopCity" TEXT`,
    `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "shopDistrict" TEXT`,
    `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "discountRate" DOUBLE PRECISION`,
    `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "creditLimit" DOUBLE PRECISION`,
    `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "creditBalance" DOUBLE PRECISION NOT NULL DEFAULT 0`,
    `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "minOrderAmount" DOUBLE PRECISION`,
    `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "minOrderQuantity" INTEGER`,
    `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "paymentTermDays" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "dealerTier" TEXT NOT NULL DEFAULT 'standard'`,
    `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT`,
    `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "notes" TEXT`,

    // DealerTierDiscount table (Faz 6)
    `CREATE TABLE IF NOT EXISTS "dealer_tier_discounts" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "tier" TEXT NOT NULL,
      "discountRate" DOUBLE PRECISION NOT NULL,
      "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "paymentTermDays" INTEGER NOT NULL DEFAULT 0,
      "description" TEXT,
      CONSTRAINT "dealer_tier_discounts_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "dealer_tier_discounts_tier_key" UNIQUE ("tier")
    )`,

    // DealerPayment table (Faz 6)
    `CREATE TABLE IF NOT EXISTS "dealer_payments" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "dealerId" TEXT NOT NULL,
      "orderId" TEXT,
      "amount" DOUBLE PRECISION NOT NULL,
      "type" TEXT NOT NULL,
      "method" TEXT,
      "description" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "dealer_payments_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dealer_payments_dealerId_fkey') THEN ALTER TABLE "dealer_payments" ADD CONSTRAINT "dealer_payments_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,

    // EmailTemplate table (Faz 8)
    `CREATE TABLE IF NOT EXISTS "email_templates" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "name" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "variables" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "email_templates_name_key" UNIQUE ("name")
    )`,

    // EmailLog table (Faz 8)
    `CREATE TABLE IF NOT EXISTS "email_logs" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "to" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "templateId" TEXT,
      "status" TEXT NOT NULL,
      "error" TEXT,
      "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
    )`,

    // ContactMessage table (Faz 8)
    `CREATE TABLE IF NOT EXISTS "contact_messages" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "phone" TEXT,
      "subject" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "read" BOOLEAN NOT NULL DEFAULT false,
      "replied" BOOLEAN NOT NULL DEFAULT false,
      "replyText" TEXT,
      "repliedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
    )`,

    // Chat
    `CREATE TABLE IF NOT EXISTS "chat_sessions" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "sessionToken" TEXT NOT NULL,
      "customerName" TEXT,
      "customerEmail" TEXT,
      "status" TEXT NOT NULL DEFAULT 'active',
      "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
      "messageCount" INTEGER NOT NULL DEFAULT 0,
      "lastMessageAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "chat_sessions_sessionToken_key" UNIQUE ("sessionToken")
    )`,

    `CREATE TABLE IF NOT EXISTS "chat_messages" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "sessionId" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,

    // CMS
    `CREATE TABLE IF NOT EXISTS "pages" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "title" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "seoTitle" TEXT,
      "seoDescription" TEXT,
      "template" TEXT NOT NULL DEFAULT 'default',
      "published" BOOLEAN NOT NULL DEFAULT false,
      "order" INTEGER NOT NULL DEFAULT 0,
      "showInMenu" BOOLEAN NOT NULL DEFAULT false,
      "showInFooter" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "pages_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "pages_slug_key" UNIQUE ("slug")
    )`,

    `CREATE TABLE IF NOT EXISTS "blog_posts" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "title" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "excerpt" TEXT,
      "content" TEXT NOT NULL,
      "coverImage" TEXT,
      "seoTitle" TEXT,
      "seoDescription" TEXT,
      "published" BOOLEAN NOT NULL DEFAULT false,
      "publishedAt" TIMESTAMP(3),
      "authorName" TEXT NOT NULL DEFAULT 'Vorte Tekstil',
      "tags" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "blog_posts_slug_key" UNIQUE ("slug")
    )`,

    // Production
    `CREATE TABLE IF NOT EXISTS "production_orders" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "orderNumber" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "variants" JSONB NOT NULL,
      "totalQuantity" INTEGER NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'planned',
      "priority" TEXT NOT NULL DEFAULT 'normal',
      "startDate" TIMESTAMP(3),
      "targetDate" TIMESTAMP(3) NOT NULL,
      "completedDate" TIMESTAMP(3),
      "materialCost" DOUBLE PRECISION,
      "laborCost" DOUBLE PRECISION,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "production_orders_orderNumber_key" UNIQUE ("orderNumber"),
      CONSTRAINT "production_orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS "production_logs" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "productionOrderId" TEXT NOT NULL,
      "fromStatus" TEXT NOT NULL,
      "toStatus" TEXT NOT NULL,
      "note" TEXT,
      "changedBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "production_logs_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "production_logs_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,

    // Redirects & 404 Logs (Faz 14)
    `CREATE TABLE IF NOT EXISTS "redirects" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "fromPath" TEXT NOT NULL,
      "toPath" TEXT NOT NULL,
      "permanent" BOOLEAN NOT NULL DEFAULT true,
      "hits" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "redirects_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "redirects_fromPath_key" UNIQUE ("fromPath")
    )`,

    `CREATE TABLE IF NOT EXISTS "not_found_logs" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "path" TEXT NOT NULL,
      "referer" TEXT,
      "userAgent" TEXT,
      "hits" INTEGER NOT NULL DEFAULT 1,
      "lastHitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "not_found_logs_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "not_found_logs_path_key" UNIQUE ("path")
    )`,

    // Product Reviews (Faz 17)
    `CREATE TABLE IF NOT EXISTS "product_reviews" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "userId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "orderId" TEXT,
      "rating" INTEGER NOT NULL,
      "title" TEXT,
      "comment" TEXT,
      "approved" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "product_reviews_userId_productId_orderId_key" UNIQUE ("userId", "productId", "orderId"),
      CONSTRAINT "product_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,

    // Return Requests (Faz 17)
    `CREATE TABLE IF NOT EXISTS "return_requests" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "userId" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "orderItemId" TEXT,
      "reason" TEXT NOT NULL,
      "description" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "refundAmount" DOUBLE PRECISION,
      "cargoTrackingNo" TEXT,
      "adminNote" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "return_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "return_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "return_requests", "product_reviews",
    "not_found_logs", "redirects",
    "chat_messages", "chat_sessions",
    "blog_posts", "pages",
    "production_logs", "production_orders",
    "email_logs", "contact_messages", "email_templates",
    "notifications", "cart_items", "favorites", "order_items",
    "payments", "invoices", "orders", "dealer_payments", "dealer_prices",
    "variants", "products", "categories", "coupons",
    "addresses", "dealer_tier_discounts", "dealers", "users"
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

  // ===== DEALER TIER DISCOUNTS =====
  await db.dealerTierDiscount.createMany({
    data: [
      { tier: "standard", discountRate: 10, minOrderAmount: 2000, paymentTermDays: 0, description: "Yeni bayiler için başlangıç seviyesi" },
      { tier: "silver", discountRate: 15, minOrderAmount: 3000, paymentTermDays: 7, description: "Düzenli sipariş veren bayiler" },
      { tier: "gold", discountRate: 20, minOrderAmount: 5000, paymentTermDays: 15, description: "Yüksek hacimli bayiler" },
      { tier: "platinum", discountRate: 25, minOrderAmount: 10000, paymentTermDays: 30, description: "En üst düzey bayiler" },
    ],
  });
  console.log("  ✓ Dealer tier discounts created");

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
      shopCity: "Bursa",
      shopDistrict: "Nilüfer",
      shopAddress: "Atatürk Mah. İstanbul Cad. Shell İstasyonu",
      dealerTier: "gold",
      discountRate: 20,
      creditLimit: 50000,
      creditBalance: 0,
      paymentTermDays: 15,
      minOrderAmount: 5000,
      minOrderQuantity: 12,
      status: "ACTIVE",
      approvedAt: new Date(),
      approvedBy: admin.id,
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
      dealerTier: "silver",
      discountRate: 15,
      creditLimit: 30000,
      creditBalance: 0,
      paymentTermDays: 7,
      status: "ACTIVE",
      approvedAt: new Date(),
      approvedBy: admin.id,
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
