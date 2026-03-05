/**
 * AI görsel üretim endpoint'i (blog + ürün)
 * POST /api/admin/generate-image
 *
 * @google/genai SDK ile görsel üretir.
 * Öncelik: Imagen 4 → Gemini native image generation (fallback)
 *
 * Body: { prompt, filename, directory? }
 * - directory: "blog" (default) veya "products"
 *
 * Dokümantasyon:
 * - Imagen: https://ai.google.dev/gemini-api/docs/imagen
 * - Gemini image gen: https://ai.google.dev/gemini-api/docs/image-generation
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { GoogleGenAI } from "@google/genai";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const ALLOWED_DIRS = ["blog", "products"];

export const maxDuration = 60; // Image generation can take 30-60s

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY tanımlanmamış" },
      { status: 500 }
    );
  }

  try {
    const { prompt, filename, directory = "blog" } = await req.json();

    if (!prompt || !filename) {
      return NextResponse.json(
        { error: "prompt ve filename gerekli" },
        { status: 400 }
      );
    }

    // Güvenlik: sadece izin verilen dizinler
    const dir = ALLOWED_DIRS.includes(directory) ? directory : "blog";

    // Güvenli dosya adı
    const safeFilename = filename
      .replace(/[^a-z0-9-]/gi, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    const ai = new GoogleGenAI({ apiKey });

    // Önce Imagen 4 dene, başarısız olursa Gemini native image generation
    let imageBase64: string | null = null;

    imageBase64 = await tryImagen4(ai, prompt);

    if (!imageBase64) {
      console.log("[generate-image] Imagen 4 başarısız, Gemini fallback deneniyor...");
      imageBase64 = await tryGeminiImageGen(ai, prompt);
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Görsel üretilemedi. API anahtarınızın görsel üretim iznine sahip olduğundan emin olun." },
        { status: 500 }
      );
    }

    // Görseli dosya sistemine kaydet
    const uploadsDir = path.join(process.cwd(), "public", "uploads", dir);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const imageFilename = `${safeFilename}-${Date.now()}.png`;
    const imagePath = path.join(uploadsDir, imageFilename);

    const imageBuffer = Buffer.from(imageBase64, "base64");
    await writeFile(imagePath, imageBuffer);

    const imageUrl = `/uploads/${dir}/${imageFilename}`;

    console.log(`[generate-image] Görsel kaydedildi: ${imageUrl} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);

    return NextResponse.json({
      url: imageUrl,
      filename: imageFilename,
      size: imageBuffer.length,
    });
  } catch (error) {
    console.error("[generate-image] Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Görsel üretim hatası: ${msg}` },
      { status: 500 }
    );
  }
}

/**
 * Imagen 4 ile görsel üret
 */
async function tryImagen4(
  ai: GoogleGenAI,
  prompt: string
): Promise<string | null> {
  try {
    const response = await ai.models.generateImages({
      model: "imagen-4.0-generate-001",
      prompt,
      config: {
        numberOfImages: 1,
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const imageBytes = response.generatedImages[0].image?.imageBytes;
      if (imageBytes) {
        console.log("[generate-image] Imagen 4 başarılı");
        return imageBytes;
      }
    }

    return null;
  } catch (err) {
    console.error("[generate-image] Imagen 4 hatası:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Gemini native image generation (fallback)
 */
async function tryGeminiImageGen(
  ai: GoogleGenAI,
  prompt: string
): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: `Generate a professional, high-quality product/marketing image. Do NOT include any text in the image. Description: ${prompt}`,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith("image/")) {
          console.log("[generate-image] Gemini native image gen başarılı");
          return part.inlineData.data ?? null;
        }
      }
    }

    return null;
  } catch (err) {
    console.error("[generate-image] Gemini image gen hatası:", err instanceof Error ? err.message : err);
    return null;
  }
}
