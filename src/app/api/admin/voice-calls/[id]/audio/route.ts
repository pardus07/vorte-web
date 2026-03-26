import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import { readFile, stat } from "fs/promises";
import path from "path";

// GET — stream audio file for a call log
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("orders", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const callLog = await db.callLog.findUnique({
      where: { id },
      select: { audioUrl: true },
    });

    if (!callLog) {
      return NextResponse.json(
        { error: "Arama kaydı bulunamadı" },
        { status: 404 }
      );
    }

    if (!callLog.audioUrl) {
      return NextResponse.json(
        { error: "Bu arama için ses kaydı bulunmuyor" },
        { status: 404 }
      );
    }

    // Resolve file path — /uploads/audio/xxx.ogg → public/uploads/audio/xxx.ogg
    let filePath: string;
    if (callLog.audioUrl.startsWith("/uploads/")) {
      // /uploads/audio/xxx.ogg → process.cwd()/public/uploads/audio/xxx.ogg
      filePath = path.join(process.cwd(), "public", callLog.audioUrl);
    } else if (path.isAbsolute(callLog.audioUrl)) {
      filePath = callLog.audioUrl;
    } else {
      filePath = path.join(process.cwd(), callLog.audioUrl);
    }

    // Check file exists
    try {
      await stat(filePath);
    } catch {
      return NextResponse.json(
        { error: "Ses dosyası bulunamadı" },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Determine content type based on extension
    const contentTypeMap: Record<string, string> = {
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".webm": "audio/webm",
      ".m4a": "audio/mp4",
      ".aac": "audio/aac",
    };

    const contentType = contentTypeMap[ext] || "audio/mpeg";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Content-Disposition": `inline; filename="call-${id}${ext}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[voice-calls] audio GET error:", error);
    return NextResponse.json(
      { error: "Ses dosyası okunamadı" },
      { status: 500 }
    );
  }
}
