/**
 * OG Image API Route
 * Orijinal OG görseli sharp ile sıkıştırıp serve eder.
 * Facebook/WhatsApp/Twitter crawler'ları bu URL'yi kullanır.
 *
 * Endpoint: /api/og-image
 * Response: Sıkıştırılmış JPEG (~80KB)
 *
 * NOT: NextResponse yerine native Response kullanıyoruz çünkü:
 * - NextResponse otomatik Vary header ekliyor (rsc, next-router-state-tree...)
 * - Caddy reverse proxy JPEG'i gereksiz yere gzip'liyor
 * - Facebook scraper bu komboda "Corrupted Image" hatası veriyor
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getSiteSettings } from "@/lib/settings";

// Cache: sıkıştırılmış görseli bellekte tut
let cachedBuffer: Buffer | null = null;
let cachedSourceUrl: string | null = null;

export async function GET() {
  try {
    const settings = await getSiteSettings();
    const ogImageUrl = settings.ogImageUrl;

    if (!ogImageUrl) {
      // Fallback: logo.png
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      if (!existsSync(logoPath)) {
        return Response.json({ error: "No OG image configured" }, { status: 404 });
      }
      const buffer = await readFile(logoPath);
      return new Response(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // Cache hit: aynı görseli tekrar sıkıştırma
    if (cachedBuffer && cachedSourceUrl === ogImageUrl) {
      return new Response(cachedBuffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": cachedBuffer.length.toString(),
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          "Content-Encoding": "identity",
        },
      });
    }

    // OG image URL'den dosya yolunu çıkar
    // URL format: /uploads/blog/og-image-xxx.png veya https://www.vorte.com.tr/uploads/...
    let filePath: string;
    try {
      const urlPath = ogImageUrl.startsWith("http")
        ? new URL(ogImageUrl).pathname
        : ogImageUrl;

      // /uploads/... -> public/uploads/...
      const relativePath = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;
      filePath = path.join(process.cwd(), "public", relativePath);
    } catch {
      return Response.json({ error: "Invalid OG image URL" }, { status: 400 });
    }

    if (!existsSync(filePath)) {
      return Response.json({ error: "OG image file not found" }, { status: 404 });
    }

    // Sharp ile sıkıştır: 1200x630 baseline JPEG, quality 80
    // NOT: progressive: false — Facebook scraper progressive JPEG'i bazen "corrupted" algılıyor
    const sharp = (await import("sharp")).default;
    const originalBuffer = await readFile(filePath);

    const optimizedBuffer = await sharp(originalBuffer)
      .resize(1200, 630, { fit: "cover", position: "center" })
      .jpeg({ quality: 80, progressive: false, mozjpeg: true })
      .toBuffer();

    // Cache'e kaydet
    cachedBuffer = optimizedBuffer;
    cachedSourceUrl = ogImageUrl;

    return new Response(optimizedBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": optimizedBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Content-Encoding": "identity",
      },
    });
  } catch (error) {
    console.error("OG image optimization error:", error);
    return Response.json({ error: "Image processing failed" }, { status: 500 });
  }
}
