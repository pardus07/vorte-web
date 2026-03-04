export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// POST — send message, get AI response
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, sessionToken, customerName, customerEmail } = body;

  if (!message || !sessionToken) {
    return NextResponse.json({ error: "Mesaj ve session gerekli" }, { status: 400 });
  }

  // Get or create session
  let session = await db.chatSession.findUnique({
    where: { sessionToken },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
  });

  if (!session) {
    session = await db.chatSession.create({
      data: {
        sessionToken,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
      },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
    });
  }

  // Check if session is closed or admin takeover
  if (session.status === "closed") {
    return NextResponse.json({ error: "Bu sohbet sonlandırılmış" }, { status: 400 });
  }

  // Save user message
  await db.chatMessage.create({
    data: { sessionId: session.id, role: "user", content: message },
  });

  await db.chatSession.update({
    where: { id: session.id },
    data: {
      messageCount: { increment: 1 },
      lastMessageAt: new Date(),
      customerName: customerName || session.customerName,
      customerEmail: customerEmail || session.customerEmail,
    },
  });

  // If AI disabled or admin takeover, return empty (admin will respond manually)
  if (!session.aiEnabled || session.status === "admin_takeover") {
    return NextResponse.json({
      reply: "Mesajınız alındı. Yetkilimiz en kısa sürede yanıtlayacaktır.",
      sessionId: session.id,
    });
  }

  // Build AI context
  let systemPrompt = "";
  let aiModel = "claude-haiku-4-5";
  try {
    const settings = await db.siteSettings.findUnique({ where: { id: "main" } });
    systemPrompt = settings?.aiSystemPrompt || "";
    aiModel = settings?.aiModel || "claude-haiku-4-5";
  } catch {
    // Ignore
  }

  // Get product catalog for context
  let productContext = "";
  try {
    const products = await db.product.findMany({
      where: { active: true },
      select: { name: true, basePrice: true, gender: true, variants: { select: { color: true, size: true, stock: true }, where: { active: true } } },
      take: 20,
    });
    productContext = products
      .map((p) => {
        const colors = [...new Set(p.variants.map((v) => v.color))].join(", ");
        const sizes = [...new Set(p.variants.map((v) => v.size))].join(", ");
        const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
        return `- ${p.name}: ₺${p.basePrice} | Renkler: ${colors} | Bedenler: ${sizes} | Stok: ${totalStock} adet`;
      })
      .join("\n");
  } catch {
    // Ignore
  }

  const defaultSystemPrompt = `Sen Vorte Tekstil'in AI müşteri asistanısın. Türkçe yanıtla.
Vorte, erkek ve kadın iç giyim (boxer, slip, külot) üreten bir Türk markasıdır.
Web sitesi: vorte.com.tr | Lokasyon: Nilüfer/Bursa

Görevlerin:
- Ürünler hakkında bilgi ver (fiyat, renk, beden, stok)
- Sipariş ve kargo sorularına yardımcı ol
- İade politikası hakkında bilgi ver (14 gün içinde iade)
- Toptan satış için bayi başvuru formuna yönlendir (/toptan)
- Nazik, profesyonel ve kısa cevaplar ver
- Bilmediğin konularda iletişim sayfasına yönlendir (/iletisim)

${systemPrompt ? `Ek talimatlar: ${systemPrompt}` : ""}

Mevcut Ürün Kataloğu:
${productContext || "Ürün bilgisi yüklenemedi."}`;

  // Build conversation history
  const conversationMessages = session.messages.map((m) => ({
    role: m.role === "user" ? "user" as const : "assistant" as const,
    content: m.content,
  }));
  conversationMessages.push({ role: "user" as const, content: message });

  // Call Anthropic API
  let reply = "Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin veya iletişim sayfamızdan bize ulaşın.";

  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: aiModel,
        max_tokens: 500,
        system: defaultSystemPrompt,
        messages: conversationMessages,
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        reply = textBlock.text;
      }
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string; error?: { type?: string; message?: string } };
      const statusCode = error.status || 0;
      const errorType = error.error?.type || "unknown";
      const errorMsg = error.error?.message || error.message || "Bilinmeyen hata";

      console.error("Anthropic API error:", {
        status: statusCode,
        type: errorType,
        message: errorMsg,
        model: aiModel,
        keyPrefix: process.env.ANTHROPIC_API_KEY?.slice(0, 10) + "...",
      });

      // Specific error messages for debugging
      if (statusCode === 401) {
        reply = "AI servisi yapılandırma hatası: API anahtarı geçersiz. Lütfen yöneticiyle iletişime geçin.";
      } else if (statusCode === 404) {
        reply = `AI servisi yapılandırma hatası: "${aiModel}" modeli bulunamadı. Lütfen yöneticiyle iletişime geçin.`;
      } else if (statusCode === 429) {
        reply = "AI servisinde yoğunluk var, lütfen birkaç saniye sonra tekrar deneyin.";
      } else if (statusCode === 400) {
        reply = `AI servisi hatası: ${errorMsg}. Lütfen yöneticiyle iletişime geçin.`;
      }
    }
  } else {
    console.warn("ANTHROPIC_API_KEY not set — using dev mode fallback");
    reply = `Merhaba! Ben Vorte Tekstil AI asistanıyım. "${message}" sorunuz hakkında size yardımcı olmak isterim. Detaylı bilgi için lütfen iletişim sayfamızı ziyaret edin: vorte.com.tr/iletisim`;
  }

  // Save AI response
  await db.chatMessage.create({
    data: { sessionId: session.id, role: "assistant", content: reply },
  });

  await db.chatSession.update({
    where: { id: session.id },
    data: { messageCount: { increment: 1 }, lastMessageAt: new Date() },
  });

  return NextResponse.json({ reply, sessionId: session.id });
}
