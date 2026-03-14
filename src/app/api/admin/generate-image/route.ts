/**
 * AI görsel üretim endpoint'i
 * POST /api/admin/generate-image
 *
 * @google/genai SDK ile görsel üretir.
 * Öncelik: Nano Banana 2 (Gemini 3.1 Flash Image) → Nano Banana Pro (Gemini 3 Pro Image) → Imagen 4
 *
 * Body: { prompt, filename, directory? }
 * - directory: "blog" (default), "products", "sliders", "banners"
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { GoogleGenAI } from "@google/genai";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const ALLOWED_DIRS = ["blog", "products", "sliders", "banners", "emails", "stands"];

export const maxDuration = 60;

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

    const dir = ALLOWED_DIRS.includes(directory) ? directory : "blog";

    const safeFilename = filename
      .replace(/[^a-z0-9-]/gi, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    const ai = new GoogleGenAI({ apiKey });

    let imageBase64: string | null = null;

    // 1. Nano Banana 2 (Gemini 3.1 Flash Image)
    imageBase64 = await tryGeminiImageGen(ai, "gemini-3.1-flash-image-preview", prompt);

    // 2. Nano Banana Pro (Gemini 3 Pro Image) fallback
    if (!imageBase64) {
      console.log("[generate-image] Nano Banana 2 başarısız, Nano Banana Pro deneniyor...");
      imageBase64 = await tryGeminiImageGen(ai, "gemini-3-pro-image-preview", prompt);
    }

    // 3. Imagen 4 fallback
    if (!imageBase64) {
      console.log("[generate-image] Gemini modelleri başarısız, Imagen 4 deneniyor...");
      imageBase64 = await tryImagen4(ai, prompt);
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
 * Gemini native image generation (Nano Banana 2 / Nano Banana Pro)
 */
async function tryGeminiImageGen(
  ai: GoogleGenAI,
  model: string,
  prompt: string
): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Generate a professional, high-quality product/marketing image. ${prompt}`,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith("image/")) {
          const modelName = model.includes("3.1-flash") ? "Nano Banana 2" : "Nano Banana Pro";
          console.log(`[generate-image] ${modelName} başarılı`);
          return part.inlineData.data ?? null;
        }
      }
    }

    return null;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const modelName = model.includes("3.1-flash") ? "Nano Banana 2" : "Nano Banana Pro";
    console.error(`[generate-image] ${modelName} hatası:`, errMsg);
    return null;
  }
}

/**
 * Imagen 4 ile görsel üret (son fallback)
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
        personGeneration: "ALLOW_ADULT",
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
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[generate-image] Imagen 4 hatası:", errMsg);
    return null;
  }
}
