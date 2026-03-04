export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// GET /api/health/ai — Anthropic API bağlantı testi
// Deploy sonrası bu endpoint ile chatbot sorununu teşhis et
export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    envKeyExists: !!process.env.ANTHROPIC_API_KEY,
    envKeyLength: process.env.ANTHROPIC_API_KEY?.length || 0,
    envKeyPrefix: process.env.ANTHROPIC_API_KEY?.slice(0, 12) || "NOT SET",
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    diagnostics.error = "ANTHROPIC_API_KEY environment variable is not set";
    diagnostics.solution = "Add ANTHROPIC_API_KEY to Coolify environment variables";
    return NextResponse.json(diagnostics, { status: 500 });
  }

  // Test API connection
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 50,
      messages: [{ role: "user", content: "Say OK" }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    diagnostics.apiStatus = "SUCCESS";
    diagnostics.model = response.model;
    diagnostics.responseText = textBlock?.type === "text" ? textBlock.text : "no text";
    diagnostics.usage = response.usage;

    return NextResponse.json(diagnostics);
  } catch (err: unknown) {
    const error = err as {
      status?: number;
      message?: string;
      error?: { type?: string; message?: string };
      headers?: Record<string, string>;
    };

    diagnostics.apiStatus = "FAILED";
    diagnostics.httpStatus = error.status || 0;
    diagnostics.errorType = error.error?.type || "unknown";
    diagnostics.errorMessage = error.error?.message || error.message || "Unknown error";

    // Provide specific solutions
    if (error.status === 401) {
      diagnostics.solution = "API key is invalid or expired. Generate a new key at https://console.anthropic.com/settings/keys";
    } else if (error.status === 403) {
      diagnostics.solution = "API key does not have permission. Check your Anthropic account plan.";
    } else if (error.status === 404) {
      diagnostics.solution = "Model not found. Try 'claude-haiku-4-5' instead.";
    } else if (error.status === 429) {
      diagnostics.solution = "Rate limited. Check your Anthropic account usage limits.";
    } else if (error.status === 529) {
      diagnostics.solution = "Anthropic API is overloaded. Try again later.";
    } else if (!error.status) {
      diagnostics.solution = "Network error — server cannot reach api.anthropic.com. Check DNS/firewall on VDS.";
    }

    return NextResponse.json(diagnostics, { status: 500 });
  }
}
