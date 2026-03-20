import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { logActivity } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const role = (session.user as unknown as { role: string }).role;
  return role === "ADMIN";
}

const settingsSchema = z.object({
  // Genel
  siteName: z.string().min(1, "Site adı zorunlu").optional(),
  siteDescription: z.string().nullable().optional(),
  siteUrl: z.string().url("Geçerli URL girin").optional(),
  contactEmail: z.string().email("Geçerli e-posta girin").nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  contactAddress: z.string().nullable().optional(),

  // Logo & Favicon
  logoUrl: z.string().nullable().optional(),
  logoDarkUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  ogImageUrl: z.string().nullable().optional(),

  // SEO
  metaTitle: z.string().max(70, "Maks 70 karakter").nullable().optional(),
  metaDescription: z.string().max(170, "Maks 170 karakter").nullable().optional(),
  metaKeywords: z.string().nullable().optional(),

  // Üçüncü Parti
  googleVerificationCode: z.string().nullable().optional(),
  googleAnalyticsId: z.string().nullable().optional(),
  googleAdsCode: z.string().nullable().optional(),
  googleMerchantId: z.string().nullable().optional(),
  facebookPixelId: z.string().nullable().optional(),

  // AI
  aiSystemPrompt: z.string().nullable().optional(),
  aiEnabled: z.boolean().optional(),
  aiRules: z.string().nullable().optional(),

  // Sosyal Medya
  instagramUrl: z.string().url("Geçerli URL").nullable().optional().or(z.literal("")),
  facebookUrl: z.string().url("Geçerli URL").nullable().optional().or(z.literal("")),
  twitterUrl: z.string().url("Geçerli URL").nullable().optional().or(z.literal("")),
  tiktokUrl: z.string().url("Geçerli URL").nullable().optional().or(z.literal("")),
  youtubeUrl: z.string().url("Geçerli URL").nullable().optional().or(z.literal("")),

  // E-posta
  smtpHost: z.string().nullable().optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).nullable().optional(),
  smtpUser: z.string().nullable().optional(),
  smtpPassword: z.string().nullable().optional(),

  // Kargo
  freeShippingThreshold: z.coerce.number().min(0).nullable().optional(),
  defaultShippingCost: z.coerce.number().min(0).nullable().optional(),

  // Entegrasyonlar
  iyzicoApiKey: z.string().nullable().optional(),
  iyzicoSecretKey: z.string().nullable().optional(),
  iyzicoSandboxMode: z.boolean().optional(),

  geliverApiKey: z.string().nullable().optional(),
  geliverApiBaseUrl: z.string().url("Geçerli URL girin").nullable().optional().or(z.literal("")),

  diaCrmUsername: z.string().nullable().optional(),
  diaCrmPassword: z.string().nullable().optional(),
  diaCrmCompanyCode: z.string().nullable().optional(),

  resendApiKey: z.string().nullable().optional(),
  resendFromEmail: z.string().email("Geçerli e-posta girin").nullable().optional().or(z.literal("")),

  // AI — eksik olan alan
  aiModel: z.string().nullable().optional(),
});

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  let settings = await db.siteSettings.findUnique({
    where: { id: "main" },
  });

  // Yoksa varsayılanlarla oluştur
  if (!settings) {
    settings = await db.siteSettings.create({
      data: {
        id: "main",
        siteName: "Vorte Tekstil",
        siteUrl: "https://www.vorte.com.tr",
        contactEmail: "info@vorte.com.tr",
        contactPhone: "+90 850 305 8635",
        contactAddress: "Dumlupınar Mah., Kayabaşı Sok., 17BG, Nilüfer/Bursa",
        freeShippingThreshold: 300,
        defaultShippingCost: 90,
      },
    });
  }

  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await request.json();

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veriler", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Boş string'leri null'a çevir
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === "") {
      cleanData[key] = null;
    } else if (value !== undefined) {
      cleanData[key] = value;
    }
  }

  const settings = await db.siteSettings.upsert({
    where: { id: "main" },
    update: cleanData,
    create: {
      id: "main",
      ...cleanData,
    },
  });

  const session = await auth();
  if (session?.user) {
    logActivity(
      (session.user as { id: string }).id,
      "settings.update",
      "main",
      JSON.stringify(Object.keys(cleanData)),
      request.headers.get("x-forwarded-for") || undefined
    );
  }

  return NextResponse.json(settings);
}
