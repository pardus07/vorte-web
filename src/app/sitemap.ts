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

  // Blog pages
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const posts = await db.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true, publishedAt: true },
    });

    blogPages = [
      { url: `${baseUrl}/blog`, changeFrequency: "weekly" as const, priority: 0.6 },
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
