/**
 * Vorte Admin AI Agent — Tool Executor
 * Gemini function call sonuçlarını mevcut /api/admin/* endpoint'lerine yönlendirir.
 * Yeni API yazmaz — sadece internal fetch ile mevcut endpoint'leri çağırır.
 */

import { TOOL_META, type ApprovalLevel } from "./ai-agent-tools";

export interface ToolCallResult {
  toolName: string;
  approvalLevel: ApprovalLevel;
  description: string;
  /** SEVİYE 1 ise data dolu, SEVİYE 2-3 ise pending onay */
  data?: unknown;
  /** SEVİYE 2-3 ise onay bekleyen args */
  pendingArgs?: Record<string, unknown>;
  error?: string;
  /** Executor tarafından oluşturulan API URL */
  apiUrl?: string;
  method?: string;
}

/**
 * Tool çağrısını resolve et:
 * - SEVİYE 1 → direkt çalıştır, data döndür
 * - SEVİYE 2/3 → çalıştırmadan pendingArgs olarak döndür (frontend onay bekler)
 */
export async function resolveToolCall(
  toolName: string,
  args: Record<string, unknown>,
  baseUrl: string,
  cookies: string
): Promise<ToolCallResult> {
  const meta = TOOL_META[toolName];
  if (!meta) {
    return {
      toolName,
      approvalLevel: 1,
      description: "Bilinmeyen tool",
      error: `Tool bulunamadı: ${toolName}`,
    };
  }

  // SEVİYE 2-3 → onay gerekiyor, henüz çalıştırma
  if (meta.approvalLevel >= 2) {
    return {
      toolName,
      approvalLevel: meta.approvalLevel,
      description: meta.description,
      pendingArgs: args,
      apiUrl: buildApiUrl(meta.endpoint, meta.pathParam, args),
      method: meta.method,
    };
  }

  // SEVİYE 1 → direkt çalıştır
  try {
    const data = await executeToolCall(toolName, args, baseUrl, cookies);
    return {
      toolName,
      approvalLevel: 1,
      description: meta.description,
      data,
    };
  } catch (err) {
    return {
      toolName,
      approvalLevel: 1,
      description: meta.description,
      error: err instanceof Error ? err.message : "Bilinmeyen hata",
    };
  }
}

/**
 * Onaylanan tool çağrısını çalıştır (SEVİYE 2-3 onay sonrası)
 */
export async function executeApprovedToolCall(
  toolName: string,
  args: Record<string, unknown>,
  baseUrl: string,
  cookies: string
): Promise<{ data?: unknown; error?: string }> {
  try {
    const data = await executeToolCall(toolName, args, baseUrl, cookies);
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Bilinmeyen hata" };
  }
}

// ─── İç fonksiyonlar ─────────────────────────────────────────

/**
 * Endpoint URL'si oluştur (path param desteği ile)
 */
function buildApiUrl(
  endpoint: string,
  pathParam: string | undefined,
  args: Record<string, unknown>
): string {
  if (!pathParam) return endpoint;

  const paramValue = args[pathParam];
  if (!paramValue) return endpoint;

  return `${endpoint}/${paramValue}`;
}

/**
 * Belirli tool'lar için özel URL yönlendirmesi
 * (bazı tool'lar farklı sub-route kullanır)
 */
function getSpecialRoute(
  toolName: string,
  args: Record<string, unknown>
): { endpoint: string; method: string } | null {
  switch (toolName) {
    // ── Sipariş alt-route'ları ──
    case "create_shipment":
      return {
        endpoint: `/api/admin/orders/${args.orderId}/ship`,
        method: "POST",
      };
    case "process_refund":
      return {
        endpoint: `/api/admin/orders/${args.orderId}/refund`,
        method: "POST",
      };
    case "create_invoice":
      return {
        endpoint: `/api/admin/orders/${args.orderId}/invoice`,
        method: "POST",
      };

    // ── Bayi alt-route'ları ──
    case "get_dealer_orders":
      return {
        endpoint: `/api/admin/dealers/${args.id}/orders`,
        method: "GET",
      };
    case "get_dealer_payments":
      return {
        endpoint: `/api/admin/dealers/${args.id}/payments`,
        method: "GET",
      };
    case "create_dealer_payment":
      return {
        endpoint: `/api/admin/dealers/${args.id}/payments`,
        method: "POST",
      };

    // ── Slider/Banner CRUD ──
    case "manage_sliders": {
      const action = args.action as string;
      if (action === "list")
        return { endpoint: "/api/admin/sliders", method: "GET" };
      if (action === "create")
        return { endpoint: "/api/admin/sliders", method: "POST" };
      if (action === "update")
        return { endpoint: `/api/admin/sliders/${args.id}`, method: "PUT" };
      if (action === "delete")
        return { endpoint: `/api/admin/sliders/${args.id}`, method: "DELETE" };
      return null;
    }
    case "manage_banners": {
      const action = args.action as string;
      if (action === "list")
        return { endpoint: "/api/admin/banners", method: "GET" };
      if (action === "create")
        return { endpoint: "/api/admin/banners", method: "POST" };
      if (action === "update")
        return { endpoint: `/api/admin/banners/${args.id}`, method: "PUT" };
      if (action === "delete")
        return { endpoint: `/api/admin/banners/${args.id}`, method: "DELETE" };
      return null;
    }

    // ── Bayi Seviye ──
    case "manage_dealer_tiers": {
      const action = args.action as string;
      if (action === "create")
        return { endpoint: "/api/admin/dealers/tiers", method: "POST" };
      if (action === "update")
        return {
          endpoint: `/api/admin/dealers/tiers/${args.id}`,
          method: "PUT",
        };
      if (action === "delete")
        return {
          endpoint: `/api/admin/dealers/tiers/${args.id}`,
          method: "DELETE",
        };
      return null;
    }

    // ── Yorum moderasyon/silme ──
    case "moderate_review":
      return {
        endpoint: `/api/admin/reviews/${args.id}`,
        method: "PUT",
      };
    case "delete_review":
      return {
        endpoint: `/api/admin/reviews/${args.id}`,
        method: "DELETE",
      };

    // ── Chat yönetim ──
    case "manage_chat":
      return {
        endpoint: `/api/admin/chat/${args.id}`,
        method: "PUT",
      };
    case "delete_chat":
      return {
        endpoint: `/api/admin/chat/${args.id}`,
        method: "DELETE",
      };

    // ── Müşteri (role filtresi) ──
    case "get_customers":
      return { endpoint: "/api/admin/users?role=CUSTOMER", method: "GET" };
    case "get_admin_users":
      return { endpoint: "/api/admin/users?role=ADMIN,EDITOR,VIEWER", method: "GET" };

    // ── Kupon CRUD ──
    case "update_coupon":
      return { endpoint: `/api/admin/coupons/${args.id}`, method: "PUT" };
    case "delete_coupon":
      return { endpoint: `/api/admin/coupons/${args.id}`, method: "DELETE" };

    // ── Kullanıcı CRUD ──
    case "update_admin_user":
      return { endpoint: `/api/admin/users/${args.id}`, method: "PUT" };
    case "delete_admin_user":
      return { endpoint: `/api/admin/users/${args.id}`, method: "DELETE" };

    // ── Bildirimler ──
    case "mark_notifications_read":
      return { endpoint: "/api/admin/notifications/read-all", method: "POST" };

    default:
      return null;
  }
}

/**
 * Internal fetch ile mevcut API endpoint'ini çağır
 */
async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  baseUrl: string,
  cookies: string
): Promise<unknown> {
  const meta = TOOL_META[toolName];
  if (!meta) throw new Error(`Tool bulunamadı: ${toolName}`);

  // Özel route kontrolü
  const specialRoute = getSpecialRoute(toolName, args);

  let url: string;
  let method: string;

  if (specialRoute) {
    url = `${baseUrl}${specialRoute.endpoint}`;
    method = specialRoute.method;
  } else {
    const apiPath = buildApiUrl(meta.endpoint, meta.pathParam, args);
    url = `${baseUrl}${apiPath}`;
    method = meta.method;
  }

  // GET istekleri için query params oluştur
  if (method === "GET") {
    const queryArgs = { ...args };
    // pathParam'ı query'den çıkar
    if (meta.pathParam) delete queryArgs[meta.pathParam];

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryArgs)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs;
    }
  }

  // Fetch seçenekleri
  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies,
    },
  };

  // POST/PUT/PATCH/DELETE body
  if (method !== "GET") {
    // pathParam ve action (manage_*) alanlarını body'den çıkar
    const bodyArgs = { ...args };
    if (meta.pathParam) delete bodyArgs[meta.pathParam];

    // manage_* tool'larında action da çıkar
    if (toolName.startsWith("manage_")) delete bodyArgs.action;

    // Boş body gönderme
    if (Object.keys(bodyArgs).length > 0) {
      fetchOptions.body = JSON.stringify(bodyArgs);
    }
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMsg: string;
    try {
      const parsed = JSON.parse(errorBody);
      errorMsg = parsed.error || parsed.message || errorBody;
    } catch {
      errorMsg = errorBody;
    }
    throw new Error(`API hatası (${response.status}): ${errorMsg}`);
  }

  // Boş yanıt kontrolü
  const text = await response.text();
  if (!text) return { success: true };

  try {
    return JSON.parse(text);
  } catch {
    return { success: true, message: text };
  }
}

/**
 * Tool adından Türkçe işlem özeti oluştur
 */
export function getToolSummary(toolName: string): string {
  const meta = TOOL_META[toolName];
  return meta?.description || toolName;
}

/**
 * Onay seviyesine göre Türkçe etiket
 */
export function getApprovalLabel(level: ApprovalLevel): string {
  switch (level) {
    case 1:
      return "Bilgi";
    case 2:
      return "Onay Gerekli";
    case 3:
      return "Kritik İşlem — Çift Onay";
  }
}
