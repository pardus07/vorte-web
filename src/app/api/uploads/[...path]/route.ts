/**
 * Runtime uploads dosyalarını serve eden API route.
 * Next.js standalone mode public/ dizininden runtime dosya serve etmez.
 * Bu route /api/uploads/* isteklerini public/uploads/ dizininden okur.
 *
 * Örnek: /api/uploads/blog/image.png → public/uploads/blog/image.png
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  // Güvenlik: path traversal engelle
  const filePath = segments.join("/");
  if (filePath.includes("..") || filePath.includes("~")) {
    return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext];

  // Sadece izin verilen dosya türleri
  if (!mimeType) {
    return NextResponse.json({ error: "Desteklenmeyen dosya türü" }, { status: 400 });
  }

  const absolutePath = path.join(process.cwd(), "public", "uploads", filePath);

  if (!existsSync(absolutePath)) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  try {
    const buffer = await readFile(absolutePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Dosya okunamadı" }, { status: 500 });
  }
}
