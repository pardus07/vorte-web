import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/_next/static/", "/_next/image/"],
        disallow: ["/admin/", "/bayi/", "/bayi-girisi", "/api/", "/hesabim/", "/odeme/", "/sepet"],
      },
      // AI arama motorları — açıkça izin ver
      {
        userAgent: ["ChatGPT-User", "GPTBot", "PerplexityBot", "Google-Extended", "ClaudeBot", "anthropic-ai", "Bytespider"],
        allow: ["/"],
        disallow: ["/admin/", "/bayi/", "/api/", "/hesabim/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
