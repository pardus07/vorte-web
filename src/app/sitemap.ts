import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Sitemap her 1 saatte bir yeniden oluşturulur (ISR)
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr";

  const now = new Date();

  // Statik sayfalar
  const staticPages: MetadataRoute.Sitemap = [
    // Ana sayfa + kategoriler
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/erkek-ic-giyim`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/kadin-ic-giyim`, lastModified: now, changeFrequency: "daily", priority: 0.9 },

    // Ticari sayfalar
    { url: `${baseUrl}/toptan`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/sss`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/kargo-teslimat`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },

    // Kurumsal
    { url: `${baseUrl}/hakkimizda`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/iletisim`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },

    // Hukuki sayfalar
    { url: `${baseUrl}/gizlilik-politikasi`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/kvkk`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/mesafeli-satis`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/iade-politikasi`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/kullanim-kosullari`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
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

  // Blog pages
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const posts = await db.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true, publishedAt: true },
    });

    blogPages = [
      { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 },
      ...posts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // DB unavailable during build
  }

  // Dynamic CMS pages
  let cmsPages: MetadataRoute.Sitemap = [];
  try {
    const pages = await db.page.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });

    cmsPages = pages.map((page) => ({
      url: `${baseUrl}/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  } catch {
    // DB unavailable during build
  }

  return [...staticPages, ...productPages, ...blogPages, ...cmsPages];
}
