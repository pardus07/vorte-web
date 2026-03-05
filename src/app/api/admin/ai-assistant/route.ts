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

export const maxDuration = 120; // Image generation chain can take 60s+

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
      { error: "GEMINI_API_KEY tanımlanmamış." },
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

    // Onay işlemi
    if (action === "approve" && approveData) {
      return handleApproval(approveData, req);
    }

    // Chat işlemi
    return await handleChat(apiKey, messages, currentPage, req);
  } catch (error) {
    console.error("[ai-assistant] Top-level error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `AI asistan hatası: ${msg}` },
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
  // 1) Dinamik context
  let dynamicCtx;
  try {
    dynamicCtx = await fetchDynamicContext();
  } catch (err) {
    console.error("[ai-assistant] fetchDynamicContext error:", err);
    dynamicCtx = { productCount: 0, dealerCount: 0, pendingOrders: 0, categories: [] };
  }

  const pageCtx = getPageContext(currentPage);
  const systemPrompt = buildSystemPrompt({
    currentPage,
    pageTitle: pageCtx.pageTitle,
    ...dynamicCtx,
  });

  // 2) Gemini client
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations: agentFunctionDeclarations }],
  });

  // 3) History hazırla — son mesaj hariç
  const history = messages.length > 1 ? messages.slice(0, -1) : [];
  const chat = model.startChat({ history });

  // 4) Son mesajı gönder
  const lastMessage = messages[messages.length - 1];
  let lastText = "";
  if (lastMessage?.parts) {
    const firstPart = lastMessage.parts[0];
    lastText = typeof firstPart === "string" ? firstPart : firstPart?.text || "";
  }

  if (!lastText) {
    return NextResponse.json({ reply: "Mesaj boş geldi. Tekrar dener misin?" });
  }

  console.log("[ai-assistant] Sending to Gemini:", lastText.substring(0, 100));
  console.log("[ai-assistant] History length:", history.length);

  // Gemini'ye gönder — boş yanıt gelirse 1 kez retry
  let response;
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await chat.sendMessage(lastText);
    response = result.response;

    // Yanıt boş mu kontrol et
    let hasContent = false;
    try {
      const fc = response.functionCalls();
      if (fc && fc.length > 0) hasContent = true;
    } catch { /* no function calls */ }
    if (!hasContent) {
      try {
        const t = response.text();
        if (t && t.trim()) hasContent = true;
      } catch { /* no text */ }
    }

    if (hasContent) break;
    if (attempt === 0) {
      console.log("[ai-assistant] Empty response, retrying...");
    }
  }

  if (!response) {
    return NextResponse.json({ reply: "Yanıt alınamadı. Lütfen tekrar deneyin." });
  }

  // 5) Function call kontrolü
  let functionCalls;
  try {
    functionCalls = response.functionCalls();
  } catch {
    functionCalls = null;
  }

  console.log("[ai-assistant] Function calls:", functionCalls?.map(fc => fc.name) || "none");

  if (functionCalls && functionCalls.length > 0) {
    const fc = functionCalls[0];
    const toolName = fc.name;
    const args = (fc.args || {}) as Record<string, unknown>;

    console.log("[ai-assistant] Executing tool:", toolName, JSON.stringify(args).substring(0, 200));

    const baseUrl = getBaseUrl(req);
    const cookies = req.headers.get("cookie") || "";

    const toolResult = await resolveToolCall(toolName, args, baseUrl, cookies);

    if (toolResult.approvalLevel === 1) {
      if (toolResult.error) {
        return NextResponse.json({
          reply: `❌ ${toolResult.description} başarısız: ${toolResult.error}`,
          toolCall: { name: toolName, args, error: toolResult.error, approvalLevel: 1 },
        });
      }

      // Sonucu Gemini'ye geri gönder → Türkçe özet al
      // Multi-step: Gemini sonuç aldıktan sonra 2. tool çağırabilir (max 3 adım)
      try {
        let currentResponse = await chat.sendMessage([
          {
            functionResponse: {
              name: toolName,
              response: { result: toolResult.data },
            },
          },
        ]);

        // Multi-step tool calling loop (max 6 ek adım — ürün görselleri 4 generate + 1 update)
        for (let step = 0; step < 6; step++) {
          let chainedCalls;
          try {
            chainedCalls = currentResponse.response.functionCalls();
          } catch {
            chainedCalls = null;
          }

          if (!chainedCalls || chainedCalls.length === 0) break;

          const chainedFc = chainedCalls[0];
          const chainedName = chainedFc.name;
          const chainedArgs = (chainedFc.args || {}) as Record<string, unknown>;

          console.log(`[ai-assistant] Chain step ${step + 1}:`, chainedName, JSON.stringify(chainedArgs).substring(0, 200));

          const chainedResult = await resolveToolCall(chainedName, chainedArgs, baseUrl, cookies);

          // Zincirlenen tool SEVİYE 2-3 ise → onay kartı döndür
          if (chainedResult.approvalLevel >= 2) {
            let chainText = "";
            try { chainText = currentResponse.response.text(); } catch { /* */ }

            return NextResponse.json({
              reply: chainText || `${chainedResult.description} için onayınız gerekiyor.`,
              pendingAction: {
                toolName: chainedName,
                args: chainedResult.pendingArgs,
                approvalLevel: chainedResult.approvalLevel,
                description: chainedResult.description,
                apiUrl: chainedResult.apiUrl,
                method: chainedResult.method,
              },
            });
          }

          if (chainedResult.error) {
            return NextResponse.json({
              reply: `❌ ${chainedResult.description} başarısız: ${chainedResult.error}`,
            });
          }

          // Sonucu Gemini'ye geri gönder
          currentResponse = await chat.sendMessage([
            {
              functionResponse: {
                name: chainedName,
                response: { result: chainedResult.data },
              },
            },
          ]);
        }

        let finalText = "";
        try {
          finalText = currentResponse.response.text();
        } catch {
          finalText = "İşlem tamamlandı. Sonuç alındı.";
        }

        return NextResponse.json({
          reply: finalText || "İşlem tamamlandı.",
          toolCall: { name: toolName, args, result: toolResult.data, approvalLevel: 1 },
        });
      } catch (err) {
        console.error("[ai-assistant] Tool response to Gemini error:", err);
        return NextResponse.json({
          reply: `✅ ${toolResult.description} tamamlandı.`,
          toolCall: { name: toolName, args, result: toolResult.data, approvalLevel: 1 },
        });
      }
    }

    // SEVİYE 2-3 — onay bekle
    let aiText = "";
    try {
      aiText = response.text();
    } catch {
      aiText = "";
    }

    return NextResponse.json({
      reply: aiText || `${toolResult.description} için onayınız gerekiyor.`,
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

  // 6) Düz metin yanıt
  let text = "";
  try {
    text = response.text();
  } catch {
    text = "";
  }

  if (!text) {
    // Gemini boş döndü — candidates kontrolü
    const candidates = response.candidates;
    console.error("[ai-assistant] Empty response. Candidates:", JSON.stringify(candidates));
    return NextResponse.json({
      reply: "Yanıt alınamadı. Lütfen tekrar deneyin.",
    });
  }

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
