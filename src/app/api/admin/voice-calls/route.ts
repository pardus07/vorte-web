import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, getAdminSession } from "@/lib/admin-auth";
import { resendClient } from "@/lib/integrations/resend";

// GET — list call logs with filters & pagination
export async function GET(request: NextRequest) {
  const admin = await requirePermission("orders", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = parseInt(sp.get("limit") || "20");
  const search = sp.get("search") || "";
  const status = sp.get("status") || "";
  const direction = sp.get("direction") || "";
  const dateFrom = sp.get("dateFrom") || "";
  const dateTo = sp.get("dateTo") || "";
  const isRead = sp.get("isRead"); // "true" | "false" | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { callerNumber: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (direction) {
    where.callDirection = direction;
  }

  if (isRead === "true") {
    where.isRead = true;
  } else if (isRead === "false") {
    where.isRead = false;
  }

  if (dateFrom || dateTo) {
    where.startedAt = {};
    if (dateFrom) where.startedAt.gte = new Date(dateFrom);
    if (dateTo) where.startedAt.lte = new Date(dateTo);
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [calls, total, todayCalls, missedCalls, allDurations] = await Promise.all([
      db.callLog.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.callLog.count({ where }),
      db.callLog.count({ where: { startedAt: { gte: today } } }),
      db.callLog.count({ where: { status: "missed" } }),
      db.callLog.aggregate({ _sum: { durationSeconds: true }, _avg: { durationSeconds: true } }),
    ]);

    return NextResponse.json({
      calls,
      total,
      stats: {
        todayCalls,
        totalDuration: allDurations._sum.durationSeconds || 0,
        avgDuration: Math.round(allDurations._avg.durationSeconds || 0),
        missedCalls,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[voice-calls] GET error:", error);
    return NextResponse.json(
      { error: "Arama kayıtları alınamadı" },
      { status: 500 }
    );
  }
}

// POST — create a new call log (from Voice AI server-to-server or admin session)
export async function POST(request: NextRequest) {
  // Allow server-to-server calls with special header OR admin session
  const serverKey = request.headers.get("x-server-api-key");
  const isServerCall = serverKey === process.env.VORTE_INTERNAL_API_KEY ||
                       request.headers.get("x-voice-ai-source") === "vorte-voice-ai";

  if (!isServerCall) {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
  }

  try {
    const body = await request.json();

    const {
      callId,
      callerNumber,
      callDirection = "inbound",
      status = "completed",
      startedAt,
      endedAt,
      durationSeconds = 0,
      topics = [],
      summary,
      sentiment,
      transcript,
      audioUrl,
      transferredTo,
    } = body;

    if (!callId || !callerNumber || !startedAt) {
      return NextResponse.json(
        { error: "callId, callerNumber ve startedAt zorunludur" },
        { status: 400 }
      );
    }

    // Create call log
    const callLog = await db.callLog.create({
      data: {
        callId,
        callerNumber,
        callDirection,
        status,
        startedAt: new Date(startedAt),
        endedAt: endedAt ? new Date(endedAt) : null,
        durationSeconds,
        topics,
        summary: summary || null,
        sentiment: sentiment || null,
        transcript: transcript || null,
        audioUrl: audioUrl || null,
        transferredTo: transferredTo || null,
      },
    });

    // Create notification
    const durationMin = Math.floor(durationSeconds / 60);
    const durationSec = durationSeconds % 60;
    const durationStr = `${durationMin}dk ${durationSec}sn`;

    await db.notification.create({
      data: {
        type: "VOICE_CALL",
        title: `Sesli Arama: ${callerNumber}`,
        message: summary
          ? `${callerNumber} - ${durationStr} - ${summary.slice(0, 100)}`
          : `${callerNumber} numarasından ${durationStr} süreli arama`,
      },
    });

    // Send email notification
    let emailSent = false;
    try {
      const topicsStr = topics.length > 0 ? topics.join(", ") : "Belirtilmemiş";
      const sentimentStr = sentiment || "Belirtilmemiş";

      await resendClient.sendEmail({
        to: "vortekurumsal@gmail.com",
        subject: `Vorte Voice AI — Yeni Arama: ${callerNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Yeni Sesli Arama Kaydı</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Arayan:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${callerNumber}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Yön:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${callDirection === "inbound" ? "Gelen" : "Giden"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Süre:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${durationStr}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Durum:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${status}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Konular:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${topicsStr}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Duygu:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${sentimentStr}</td></tr>
              ${summary ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Özet:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${summary}</td></tr>` : ""}
              ${transferredTo ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Yönlendirme:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${transferredTo}</td></tr>` : ""}
            </table>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">Bu e-posta Vorte Voice AI sistemi tarafından otomatik gönderilmiştir.</p>
          </div>
        `,
        templateName: "contact-notification",
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("[voice-calls] Email gönderilemedi:", emailErr);
    }

    // Update emailSent status
    if (emailSent) {
      await db.callLog.update({
        where: { id: callLog.id },
        data: { emailSent: true },
      });
    }

    return NextResponse.json({ callLog: { ...callLog, emailSent } }, { status: 201 });
  } catch (error) {
    console.error("[voice-calls] POST error:", error);

    // Duplicate callId check
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "Bu callId zaten kayıtlı" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Arama kaydı oluşturulamadı" },
      { status: 500 }
    );
  }
}
