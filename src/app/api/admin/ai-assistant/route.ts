/**
 * Vorte Admin AI Agent — API Route
 * POST /api/admin/ai-assistant
 *
 * Gemini 2.5 Flash + Native Function Calling
 * Sadece ADMIN rolü erişebilir.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import { requireAdmin } from "@/lib/admin-auth";
import { agentFunctionDeclarations } from "@/lib/ai-agent-tools";
import { resolveToolCall, executeApprovedToolCall } from "@/lib/ai-agent-executor";
import { buildSystemPrompt, fetchDynamicContext } from "@/lib/ai-agent-prompt";
import { getPageContext } from "@/lib/ai-agent-context";

const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * POST /api/admin/ai-assistant
 *
 * Body:
 * {
 *   messages: [{ role: "user"|"model", parts: [{ text: string }] }],
 *   currentPage?: string,
 *   action?: "chat" | "approve" | "reject",
 *   approveData?: { toolName: string, args: Record<string, unknown> }
 * }
 */
export async function POST(req: NextRequest) {
  // Auth: sadece ADMIN
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Bu özellik sadece admin kullanıcılar için kullanılabilir." },
      { status: 403 }
    );
  }

  // API key kontrolü
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY tanımlanmamış. Ayarlar > Entegrasyonlar bölümünden ekleyin." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const {
      messages = [],
      currentPage = "/admin",
      action = "chat",
      approveData,
    } = body;

    // Onay işlemi — tool çalıştır
    if (action === "approve" && approveData) {
      return handleApproval(approveData, req);
    }

    // Chat işlemi — Gemini'ye gönder
    return handleChat(apiKey, messages, currentPage, req);
  } catch (error) {
    console.error("[ai-assistant] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI asistan hatası oluştu.",
      },
      { status: 500 }
    );
  }
}

// ─── Chat Handler ────────────────────────────────────────────

async function handleChat(
  apiKey: string,
  messages: Content[],
  currentPage: string,
  req: NextRequest
) {
  // Dinamik context
  const dynamicCtx = await fetchDynamicContext();
  const pageCtx = getPageContext(currentPage);

  // System prompt
  const systemPrompt = buildSystemPrompt({
    currentPage,
    pageTitle: pageCtx.pageTitle,
    ...dynamicCtx,
  });

  // Gemini client
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations: agentFunctionDeclarations }],
  });

  // Chat başlat
  const chat = model.startChat({
    history: messages.slice(0, -1), // Son mesaj hariç geçmiş
  });

  // Son mesajı gönder
  const lastMessage = messages[messages.length - 1];
  const lastText =
    lastMessage?.parts?.[0]?.text || lastMessage?.parts?.[0] || "";

  const result = await chat.sendMessage(String(lastText));
  const response = result.response;

  // Function call kontrolü
  const functionCalls = response.functionCalls();

  if (functionCalls && functionCalls.length > 0) {
    const fc = functionCalls[0]; // Tek function call
    const toolName = fc.name;
    const args = (fc.args || {}) as Record<string, unknown>;

    // Base URL + cookies
    const baseUrl = getBaseUrl(req);
    const cookies = req.headers.get("cookie") || "";

    // Tool'u resolve et (SEVİYE 1 direkt çalıştır, 2-3 onay beklet)
    const toolResult = await resolveToolCall(
      toolName,
      args,
      baseUrl,
      cookies
    );

    if (toolResult.approvalLevel === 1 && toolResult.data) {
      // SEVİYE 1 — sonucu Gemini'ye geri gönder
      const toolResponseResult = await chat.sendMessage([
        {
          functionResponse: {
            name: toolName,
            response: toolResult.data as object,
          },
        },
      ]);

      const finalText =
        toolResponseResult.response.text() || "İşlem tamamlandı.";

      return NextResponse.json({
        reply: finalText,
        toolCall: {
          name: toolName,
          args,
          result: toolResult.data,
          approvalLevel: 1,
        },
      });
    }

    if (toolResult.approvalLevel === 1 && toolResult.error) {
      // SEVİYE 1 hata
      return NextResponse.json({
        reply: `❌ İşlem başarısız: ${toolResult.error}`,
        toolCall: {
          name: toolName,
          args,
          error: toolResult.error,
          approvalLevel: 1,
        },
      });
    }

    // SEVİYE 2-3 — onay bekle
    const aiText = response.text() || "";
    return NextResponse.json({
      reply: aiText,
      pendingAction: {
        toolName,
        args: toolResult.pendingArgs,
        approvalLevel: toolResult.approvalLevel,
        description: toolResult.description,
        apiUrl: toolResult.apiUrl,
        method: toolResult.method,
      },
    });
  }

  // Düz metin yanıt (tool çağrısı yok)
  const text = response.text() || "Bir şeyler ters gitti. Tekrar dener misin?";
  return NextResponse.json({ reply: text });
}

// ─── Approval Handler ────────────────────────────────────────

async function handleApproval(
  approveData: { toolName: string; args: Record<string, unknown> },
  req: NextRequest
) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const baseUrl = getBaseUrl(req);
  const cookies = req.headers.get("cookie") || "";

  const result = await executeApprovedToolCall(
    approveData.toolName,
    approveData.args,
    baseUrl,
    cookies
  );

  if (result.error) {
    return NextResponse.json({
      reply: `❌ İşlem başarısız: ${result.error}`,
      approved: false,
      error: result.error,
    });
  }

  return NextResponse.json({
    reply: "✅ İşlem başarıyla tamamlandı.",
    approved: true,
    data: result.data,
  });
}

// ─── Yardımcı ────────────────────────────────────────────────

function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}
