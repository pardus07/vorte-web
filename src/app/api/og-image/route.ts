/**
 * OG Image API Route
 * Orijinal OG görseli sharp ile sıkıştırıp diske kaydeder,
 * sonra dosyayı doğrudan binary olarak döner.
 *
 * Endpoint: /api/og-image
 * Response: Baseline JPEG 1200x630
 *
 * Strateji: Sharp ile optimize → public/uploads/og-optimized.jpg olarak kaydet
 * Bir kez optimize ettikten sonra disk cache'inden serve et.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getSiteSettings } from "@/lib/settings";

const OPTIMIZED_PATH = path.join(process.cwd(), "public", "uploads", "og-optimized.jpg");
let lastSourceUrl: string | null = null;

export async function GET() {
  try {
    const settings = await getSiteSettings();
    const ogImageUrl = settings.ogImageUrl;

    if (!ogImageUrl) {
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

    // Disk cache: daha önce aynı kaynak görselden optimize edilmişse dosyadan oku
    if (existsSync(OPTIMIZED_PATH) && lastSourceUrl === ogImageUrl) {
      const buffer = await readFile(OPTIMIZED_PATH);
      return new Response(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    // Kaynak dosya yolunu çıkar
    let filePath: string;
    try {
      const urlPath = ogImageUrl.startsWith("http")
        ? new URL(ogImageUrl).pathname
        : ogImageUrl;
      const relativePath = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;
      filePath = path.join(process.cwd(), "public", relativePath);
    } catch {
      return Response.json({ error: "Invalid OG image URL" }, { status: 400 });
    }

    if (!existsSync(filePath)) {
      return Response.json({ error: "OG image file not found" }, { status: 404 });
    }

    // Sharp ile optimize: 1200x630 baseline JPEG
    const sharp = (await import("sharp")).default;
    const originalBuffer = await readFile(filePath);

    const optimizedBuffer = await sharp(originalBuffer)
      .resize(1200, 630, { fit: "cover", position: "center" })
      .jpeg({ quality: 80, progressive: false })
      .toBuffer();

    // Diske kaydet (uploads dizini volume mount ile persistent)
    const dir = path.dirname(OPTIMIZED_PATH);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(OPTIMIZED_PATH, optimizedBuffer);
    lastSourceUrl = ogImageUrl;

    return new Response(new Uint8Array(optimizedBuffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": optimizedBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("OG image optimization error:", error);
    return Response.json({ error: "Image processing failed" }, { status: 500 });
  }
}
