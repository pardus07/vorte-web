import crypto from "crypto";
import { db } from "@/lib/db";

// Retry mekanizması — DNS geçici hataları (EAI_AGAIN) için
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryable =
        err instanceof TypeError &&
        (err.message.includes("fetch failed") ||
          err.message.includes("EAI_AGAIN") ||
          err.message.includes("ENOTFOUND") ||
          err.message.includes("ETIMEDOUT"));

      if (isLastAttempt || !isRetryable) throw err;

      const delay = attempt * 1000; // 1s, 2s, 3s
      console.log(`[iyzico] Fetch attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("fetchWithRetry: unreachable");
}

// iyzico config: önce env var, yoksa DB'den oku
export interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  sandboxMode: boolean;
}

export async function getIyzicoConfig(): Promise<IyzicoConfig> {
  // Önce env var kontrol — trim ile whitespace temizle
  const envApiKey = process.env.IYZICO_API_KEY?.trim();
  const envSecretKey = process.env.IYZICO_SECRET_KEY?.trim();
  const envBaseUrl = process.env.IYZICO_BASE_URL?.trim();

  if (envApiKey && envSecretKey) {
    console.log("[iyzico] Config source: ENV VAR, apiKey:", envApiKey.substring(0, 8) + "...");
    return {
      apiKey: envApiKey,
      secretKey: envSecretKey,
      baseUrl: envBaseUrl || "https://sandbox-api.iyzipay.com",
      sandboxMode: envBaseUrl?.includes("sandbox") !== false,
    };
  }

  // Env var yoksa DB'den oku
  const settings = await db.siteSettings.findUnique({
    where: { id: "main" },
    select: {
      iyzicoApiKey: true,
      iyzicoSecretKey: true,
      iyzicoSandboxMode: true,
    },
  });

  if (settings?.iyzicoApiKey && settings?.iyzicoSecretKey) {
    const sandboxMode = settings.iyzicoSandboxMode ?? true;
    console.log("[iyzico] Config source: DATABASE, apiKey:", settings.iyzicoApiKey.substring(0, 8) + "...");
    return {
      apiKey: settings.iyzicoApiKey.trim(),
      secretKey: settings.iyzicoSecretKey.trim(),
      baseUrl: sandboxMode
        ? "https://sandbox-api.iyzipay.com"
        : "https://api.iyzipay.com",
      sandboxMode,
    };
  }

  // Hiçbiri yoksa boş dön
  console.warn("[iyzico] Config source: NONE — API keys not found!");
  return {
    apiKey: "",
    secretKey: "",
    baseUrl: "https://sandbox-api.iyzipay.com",
    sandboxMode: true,
  };
}

// iyzico IYZWSv2 authorization header — resmi SDK ile birebir uyumlu
// Kaynak: github.com/iyzico/iyzipay-node/blob/master/lib/utils.js
function generateAuthorizationHeader(
  config: IyzicoConfig,
  uri: string,
  requestBody: Record<string, unknown>
): Record<string, string> {
  // Random string — SDK: process.hrtime()[0] + Math.random().toString(8).slice(2)
  const randomString = String(Date.now()) + Math.random().toString(8).slice(2);

  // HMAC-SHA256 imza: randomKey + uri + JSON.stringify(body)
  // SDK'da body obje olarak gelir ve içeride JSON.stringify yapılır
  const hashStr = randomString + uri + JSON.stringify(requestBody);
  const signature = crypto
    .createHmac("sha256", config.secretKey)
    .update(hashStr)
    .digest("hex");

  // Authorization parametreleri: separator = ":"
  const authorizationParams = [
    "apiKey:" + config.apiKey,
    "randomKey:" + randomString,
    "signature:" + signature,
  ];
  const base64Auth = Buffer.from(authorizationParams.join("&")).toString("base64");

  return {
    Authorization: `IYZWSv2 ${base64Auth}`,
    "Content-Type": "application/json",
    "x-iyzi-rnd": randomString,
    "x-iyzi-client-version": "iyzipay-node-2.0.65",
  };
}

export interface IyzicoPaymentRequest {
  locale?: string;
  conversationId: string;
  price: string;
  paidPrice: string;
  currency: string;
  basketId: string;
  paymentGroup: string;
  callbackUrl: string;
  enabledInstallments?: number[];
  buyer: {
    id: string;
    name: string;
    surname: string;
    gsmNumber: string;
    email: string;
    identityNumber: string;
    registrationAddress: string;
    ip: string;
    city: string;
    country: string;
  };
  shippingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
  };
  billingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
  };
  basketItems: {
    id: string;
    name: string;
    category1: string;
    itemType: string;
    price: string;
  }[];
}

export async function initializeCheckoutForm(data: IyzicoPaymentRequest) {
  const config = await getIyzicoConfig();
  const uri = "/payment/iyzipos/checkoutform/initialize/auth/ecom";

  // Body'yi obje olarak header oluşturucuya gönder (SDK ile uyumlu)
  const dataObj = data as unknown as Record<string, unknown>;
  const headers = generateAuthorizationHeader(config, uri, dataObj);
  const body = JSON.stringify(data);

  console.log("[iyzico] Initialize request:", {
    baseUrl: config.baseUrl,
    uri,
    apiKeyPrefix: config.apiKey ? config.apiKey.substring(0, 8) + "..." : "EMPTY",
    callbackUrl: data.callbackUrl,
    price: data.price,
    paidPrice: data.paidPrice,
    basketItemCount: data.basketItems.length,
  });

  const response = await fetchWithRetry(`${config.baseUrl}${uri}`, {
    method: "POST",
    headers,
    body,
  });

  const result = await response.json();

  console.log("[iyzico] Initialize response:", {
    status: result.status,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
    hasToken: !!result.token,
    hasCheckoutForm: !!result.checkoutFormContent,
  });

  return result;
}

export async function retrievePaymentResult(token: string) {
  const config = await getIyzicoConfig();
  const uri = "/payment/iyzipos/checkoutform/auth/ecom/detail";
  const requestObj = { locale: "tr", token } as Record<string, unknown>;
  const headers = generateAuthorizationHeader(config, uri, requestObj);
  const body = JSON.stringify({ locale: "tr", token });

  const response = await fetchWithRetry(`${config.baseUrl}${uri}`, {
    method: "POST",
    headers,
    body,
  });

  return response.json();
}
