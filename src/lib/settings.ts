import { cache } from "react";
import { db } from "@/lib/db";

export type SiteSettingsData = {
  siteName: string;
  siteDescription: string | null;
  siteUrl: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  googleVerificationCode: string | null;
  googleAnalyticsId: string | null;
  googleAdsCode: string | null;
  googleMerchantId: string | null;
  facebookPixelId: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  freeShippingThreshold: number | null;
  defaultShippingCost: number | null;
};

// React cache ile request-level deduplication
export const getSiteSettings = cache(async (): Promise<SiteSettingsData> => {
  try {
    const settings = await db.siteSettings.findUnique({
      where: { id: "main" },
      select: {
        siteName: true,
        siteDescription: true,
        siteUrl: true,
        contactEmail: true,
        contactPhone: true,
        contactAddress: true,
        logoUrl: true,
        logoDarkUrl: true,
        faviconUrl: true,
        ogImageUrl: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        googleVerificationCode: true,
        googleAnalyticsId: true,
        googleAdsCode: true,
        googleMerchantId: true,
        facebookPixelId: true,
        instagramUrl: true,
        facebookUrl: true,
        twitterUrl: true,
        tiktokUrl: true,
        youtubeUrl: true,
        freeShippingThreshold: true,
        defaultShippingCost: true,
      },
    });

    if (settings) return settings;
  } catch {
    // DB bağlantısı yoksa varsayılanları dön
  }

  return {
    siteName: "Vorte Tekstil",
    siteDescription: null,
    siteUrl: "https://www.vorte.com.tr",
    contactEmail: "info@vorte.com.tr",
    contactPhone: "+90 537 622 0694",
    contactAddress: null,
    logoUrl: null,
    logoDarkUrl: null,
    faviconUrl: null,
    ogImageUrl: null,
    metaTitle: null,
    metaDescription: null,
    metaKeywords: null,
    googleVerificationCode: null,
    googleAnalyticsId: null,
    googleAdsCode: null,
    googleMerchantId: null,
    facebookPixelId: null,
    instagramUrl: null,
    facebookUrl: null,
    twitterUrl: null,
    tiktokUrl: null,
    youtubeUrl: null,
    freeShippingThreshold: 200,
    defaultShippingCost: 39.90,
  };
});
