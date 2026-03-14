/**
 * Stand Paketi Görseli Yönetimi
 * GET  /api/admin/stand-images         → Stand görsellerini getir
 * POST /api/admin/stand-images         → Stand görseli ata/güncelle
 *
 * Görseller DB'de SiteSettings tablosunda standPackageImages (Json) alanında saklanır.
 * Format: { A: "/uploads/stands/stand-a-xxx.png", B: "...", C: "..." }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

const VALID_IDS = ["A", "B", "C"];

async function getStandImages(): Promise<Record<string, string>> {
  const settings = await db.siteSettings.findUnique({
    where: { id: "main" },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (settings as any)?.standPackageImages;
  if (!data) return {};
  try {
    if (typeof data === "object") return data as Record<string, string>;
    return JSON.parse(String(data));
  } catch {
    return {};
  }
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const images = await getStandImages();
  return NextResponse.json({ images });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  try {
    const { packageId, imageUrl } = await req.json();

    if (!packageId || !VALID_IDS.includes(packageId)) {
      return NextResponse.json(
        { error: "Geçersiz paket ID. A, B veya C olmalı." },
        { status: 400 }
      );
    }

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { error: "imageUrl gerekli" },
        { status: 400 }
      );
    }

    // Mevcut görselleri al ve güncelle
    const images = await getStandImages();
    images[packageId] = imageUrl;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.siteSettings as any).update({
      where: { id: "main" },
      data: { standPackageImages: images },
    });

    return NextResponse.json({
      success: true,
      message: `Stand ${packageId} görseli güncellendi`,
      images,
    });
  } catch (error) {
    console.error("[stand-images] Error:", error);
    return NextResponse.json(
      { error: "Stand görseli güncellenemedi" },
      { status: 500 }
    );
  }
}
