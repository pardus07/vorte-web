/**
 * APK indirme endpoint'i.
 * Admin panelden Vorte Asistan APK'sını indirir.
 * APK dosyası sunucuda /tmp/vorte-asistan.apk konumunda tutulur.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFile, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET() {
  // Admin session kontrolü
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz bulunmuyor." },
      { status: 401 }
    );
  }
  const role = (session.user as unknown as { role: string }).role;
  if (role !== "ADMIN") {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz bulunmuyor." },
      { status: 403 }
    );
  }

  // APK dosyasını bul — downloads volume kalıcı, redeploy'da silinmez
  const possiblePaths = [
    path.join(process.cwd(), "public", "downloads", "VorteAIAsistan-debug.apk"),
    "/app/public/downloads/VorteAIAsistan-debug.apk",
    "/opt/vorte-apk/VorteAIAsistan-debug.apk",
    path.join(process.cwd(), "public", "uploads", "vorte-asistan.apk"),
    "/app/public/uploads/vorte-asistan.apk",
  ];

  let apkPath: string | null = null;
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      apkPath = p;
      break;
    }
  }

  if (!apkPath) {
    return NextResponse.json(
      { error: "APK dosyası bulunamadı. Lütfen sunucuya yükleyin." },
      { status: 404 }
    );
  }

  try {
    const fileBuffer = await readFile(apkPath);
    const fileStat = await stat(apkPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": 'attachment; filename="VorteAIAsistan.apk"',
        "Content-Length": String(fileStat.size),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[APK Download] Dosya okuma hatası:", error);
    return NextResponse.json(
      { error: "Dosya indirilemedi." },
      { status: 500 }
    );
  }
}
