import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr";

// Yapım aşamasında: yalnızca ana sayfa. (Eski Tekstil DB-bağımlı sitemap kaldırıldı.)
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];
}
