/**
 * Vorte Admin — Toplu Teklif Gönderim
 * POST /api/admin/prospects/outreach
 *
 * Seçilen müşterilere teklif maili gönderir.
 * Tracking piksel + link wrapping ile açılma/tıklama takibi.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import { resendClient } from "@/lib/integrations/resend";

export const maxDuration = 300; // 5 dakika — toplu gönderim uzun sürebilir

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr";

// ─── Request Schema ─────────────────────────────────────────

const outreachSchema = z.object({
  prospectIds: z.array(z.string()).min(1).max(200),
  templateType: z.enum(["stand-offer", "custom"]).default("stand-offer"),
  customSubject: z.string().optional(),
  customBody: z.string().optional(),
});

// ─── Link Wrapping ──────────────────────────────────────────

function wrapLinks(html: string, trackingId: string): string {
  // <a href="..."> linklerini tracking redirect ile sarmalı
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_, url) => {
      // Tracking URL'lerini tekrar sarma
      if (url.includes("/api/track/")) return `href="${url}"`;
      const trackUrl = `${BASE_URL}/api/track/click?id=${trackingId}&url=${encodeURIComponent(url)}`;
      return `href="${trackUrl}"`;
    }
  );
}

// ─── Tracking Piksel Ekle ───────────────────────────────────

function addTrackingPixel(html: string, trackingId: string): string {
  const pixel = `<img src="${BASE_URL}/api/track/open?id=${trackingId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  // </body> öncesine ekle, yoksa sona ekle
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}

// ─── POST Handler ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "w");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 });
  }

  const parsed = outreachSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { prospectIds, templateType, customSubject, customBody } = parsed.data;

  // E-postası olan müşterileri al
  const prospects = await db.prospectCustomer.findMany({
    where: {
      id: { in: prospectIds },
      email: { not: null },
    },
    select: {
      id: true,
      name: true,
      email: true,
      brand: true,
      contactName: true,
      city: true,
    },
  });

  if (prospects.length === 0) {
    return NextResponse.json(
      { error: "E-posta adresi olan müşteri bulunamadı." },
      { status: 400 }
    );
  }

  // Şablon yükle
  let templateSubject: string;
  let templateBody: string;

  if (templateType === "custom" && customSubject && customBody) {
    templateSubject = customSubject;
    templateBody = customBody;
  } else {
    // DB'den şablon yükle
    const template = await db.emailTemplate.findUnique({
      where: { name: "prospect-stand-offer" },
    });

    if (template) {
      templateSubject = template.subject;
      templateBody = template.body;
    } else {
      // Hardcoded fallback
      templateSubject = "Vorte Tekstil — {{stationName}} İçin Hazır Satış Standı Teklifi";
      templateBody = getDefaultTemplate();
    }
  }

  // Gönderim sonuçları
  const results: Array<{
    prospectId: string;
    name: string;
    email: string;
    status: "SENT" | "FAILED" | "NO_EMAIL";
    error?: string;
  }> = [];

  // Toplu gönderim (5 sn arayla)
  for (let i = 0; i < prospects.length; i++) {
    const prospect = prospects[i];

    if (!prospect.email) {
      results.push({
        prospectId: prospect.id,
        name: prospect.name,
        email: "",
        status: "NO_EMAIL",
      });
      continue;
    }

    // OutreachEmail kaydı oluştur (trackingId otomatik)
    const outreachEmail = await db.outreachEmail.create({
      data: {
        prospectId: prospect.id,
        subject: templateSubject
          .replace("{{stationName}}", prospect.name)
          .replace("{{brandName}}", prospect.brand || "")
          .replace("{{contactName}}", prospect.contactName || ""),
        body: "", // Aşağıda doldurulacak
        status: "PENDING",
      },
    });

    // Değişken değiştirme
    let emailBody = templateBody
      .replace(/\{\{contactName\}\}/g, prospect.contactName || "Sayın Yetkili")
      .replace(/\{\{stationName\}\}/g, prospect.name)
      .replace(/\{\{brandName\}\}/g, prospect.brand || "")
      .replace(/\{\{city\}\}/g, prospect.city)
      .replace(/\{\{trackingId\}\}/g, outreachEmail.trackingId);

    // Link wrapping + tracking piksel
    emailBody = wrapLinks(emailBody, outreachEmail.trackingId);
    emailBody = addTrackingPixel(emailBody, outreachEmail.trackingId);

    const emailSubject = outreachEmail.subject;

    // Body'yi güncelle
    await db.outreachEmail.update({
      where: { id: outreachEmail.id },
      data: { body: emailBody },
    });

    try {
      await resendClient.sendEmail({
        to: prospect.email,
        subject: emailSubject,
        html: emailBody,
        templateName: "prospect-stand-offer",
      });

      // Başarılı — outreach ve prospect güncelle
      await db.outreachEmail.update({
        where: { id: outreachEmail.id },
        data: { status: "SENT", sentAt: new Date() },
      });

      await db.prospectCustomer.update({
        where: { id: prospect.id },
        data: { status: "CONTACTED" },
      });

      results.push({
        prospectId: prospect.id,
        name: prospect.name,
        email: prospect.email,
        status: "SENT",
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);

      await db.outreachEmail.update({
        where: { id: outreachEmail.id },
        data: { status: "FAILED" },
      });

      results.push({
        prospectId: prospect.id,
        name: prospect.name,
        email: prospect.email,
        status: "FAILED",
        error: errMsg,
      });
    }

    // Rate limiting — son mail hariç 5 sn bekle
    if (i < prospects.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  const sentCount = results.filter((r) => r.status === "SENT").length;
  const failedCount = results.filter((r) => r.status === "FAILED").length;

  return NextResponse.json({
    success: true,
    summary: {
      total: prospects.length,
      sent: sentCount,
      failed: failedCount,
    },
    results,
  });
}

// ─── GET: Outreach istatistikleri ───────────────────────────

export async function GET(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));

  try {
    const [emails, total, stats] = await Promise.all([
      db.outreachEmail.findMany({
        include: {
          prospect: {
            select: { name: true, brand: true, city: true, category: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.outreachEmail.count(),
      db.outreachEmail.aggregate({
        _count: { id: true },
        _sum: { openCount: true, clickCount: true },
      }),
    ]);

    // Durum bazlı istatistikler
    const sentCount = await db.outreachEmail.count({ where: { status: "SENT" } });
    const openedCount = await db.outreachEmail.count({ where: { openedAt: { not: null } } });
    const clickedCount = await db.outreachEmail.count({ where: { clickedAt: { not: null } } });
    const convertedCount = await db.prospectCustomer.count({ where: { status: "CONVERTED" } });

    return NextResponse.json({
      emails,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalSent: sentCount,
        totalOpened: openedCount,
        totalClicked: clickedCount,
        totalConverted: convertedCount,
        totalOpenCount: stats._sum.openCount || 0,
        totalClickCount: stats._sum.clickCount || 0,
      },
    });
  } catch (error) {
    console.error("[outreach] İstatistik hatası:", error);
    return NextResponse.json({ error: "İstatistikler alınamadı." }, { status: 500 });
  }
}

// ─── Varsayılan Teklif Şablonu ──────────────────────────────

function getDefaultTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="text-align:center;padding:20px 0;">
    <h1 style="margin:0;font-size:28px;color:#333;font-weight:bold;">VORTE</h1>
    <p style="margin:4px 0 0;font-size:12px;color:#7AC143;letter-spacing:3px;">TEKSTİL</p>
  </div>
  <div style="background:white;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color:#333;margin:0 0 16px;font-size:20px;">Sayın {{contactName}},</h2>
    <p style="color:#666;line-height:1.7;font-size:15px;">
      {{stationName}} için özel hazırladığımız <strong>Hazır Satış Standı</strong> teklifimizi
      dikkatinize sunmak istiyoruz.
    </p>
    <div style="background:#f0fce8;border-left:4px solid #7AC143;padding:16px;margin:20px 0;border-radius:0 6px 6px 0;">
      <h3 style="margin:0 0 8px;color:#333;font-size:16px;">Stand Paket Seçenekleri</h3>
      <table style="width:100%;font-size:14px;color:#555;">
        <tr><td style="padding:4px 0;"><strong>Stand A (50 adet):</strong></td><td>Erkek Boxer + Kadın Külot, tek yönlü stand</td></tr>
        <tr><td style="padding:4px 0;"><strong>Stand B (100 adet):</strong></td><td>4 renk seçenek, çift yönlü stand</td></tr>
        <tr><td style="padding:4px 0;"><strong>Stand C (150 adet):</strong></td><td>Tüm renkler, tam boy 145cm stand</td></tr>
      </table>
    </div>
    <p style="color:#666;line-height:1.7;font-size:15px;">
      %95 penye pamuk, %5 elastan kumaşımızla üretilen ürünlerimiz hijyenik tekli ambalajlarda,
      karton teşhir standıyla birlikte teslim edilir. Barkod ve fiyat etiketleri hazırdır.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://www.vorte.com.tr/toptan" style="display:inline-block;padding:14px 36px;background:#7AC143;color:white;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;">
        Detaylı Bilgi ve Fiyatlar
      </a>
    </div>
    <p style="color:#666;line-height:1.7;font-size:15px;">
      Numune talebi veya detaylı bilgi için bize ulaşabilirsiniz:
    </p>
    <div style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#666;">Telefon: <strong>0850 305 86 35</strong></p>
      <p style="margin:4px 0 0;font-size:14px;color:#666;">E-posta: <strong>info@vorte.com.tr</strong></p>
      <p style="margin:4px 0 0;font-size:14px;color:#666;">Web: <strong>www.vorte.com.tr</strong></p>
    </div>
  </div>
  <div style="text-align:center;padding:20px;font-size:12px;color:#999;">
    <p>Vorte Tekstil Ticaret Ltd. Şti. | Nilüfer, Bursa</p>
    <p>Bu e-posta iş teklifi amacıyla gönderilmiştir.</p>
  </div>
</div>
</body>
</html>`;
}
