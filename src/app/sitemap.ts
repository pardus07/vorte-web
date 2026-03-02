import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/erkek-ic-giyim`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/kadin-ic-giyim`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/toptan`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/hakkimizda`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/iletisim`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/gizlilik-politikasi`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/kvkk`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/mesafeli-satis`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/iade-politikasi`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/kullanim-kosullari`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Dynamic product pages
  // Not: Ürün sayısı 50.000'i geçerse generateSitemaps() ile sitemap index'e geçilecek
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const products = await db.product.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    });

    productPages = products.map((product) => ({
      url: `${baseUrl}/urun/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable during build — products will be added at runtime
  }

  return [...staticPages, ...productPages];
}
