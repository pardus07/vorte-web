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
  // Önce env var kontrol
  if (process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY) {
    return {
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      baseUrl: process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com",
      sandboxMode: process.env.IYZICO_BASE_URL?.includes("sandbox") !== false,
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
    return {
      apiKey: settings.iyzicoApiKey,
      secretKey: settings.iyzicoSecretKey,
      baseUrl: sandboxMode
        ? "https://sandbox-api.iyzipay.com"
        : "https://api.iyzipay.com",
      sandboxMode,
    };
  }

  // Hiçbiri yoksa boş dön
  return {
    apiKey: "",
    secretKey: "",
    baseUrl: "https://sandbox-api.iyzipay.com",
    sandboxMode: true,
  };
}

function generateAuthorizationHeader(
  config: IyzicoConfig,
  uri: string,
  body: string = ""
): Record<string, string> {
  const randomString = crypto.randomBytes(8).toString("hex");
  const payload = randomString + uri + body;
  const signature = crypto
    .createHmac("sha256", config.secretKey)
    .update(payload)
    .digest("hex");
  const authorizationString = `apiKey:${config.apiKey}&randomKey:${randomString}&signature:${signature}`;
  const base64Auth = Buffer.from(authorizationString).toString("base64");

  return {
    Authorization: `IYZWSv2 ${base64Auth}`,
    "Content-Type": "application/json",
    "x-iyzi-rnd": randomString,
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
  const body = JSON.stringify(data);
  const headers = generateAuthorizationHeader(config, uri, body);

  console.log("[iyzico] Initialize request:", {
    baseUrl: config.baseUrl,
    uri,
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

  return response.json();
}

export async function retrievePaymentResult(token: string) {
  const config = await getIyzicoConfig();
  const uri = "/payment/iyzipos/checkoutform/auth/ecom/detail";
  const body = JSON.stringify({ locale: "tr", token });
  const headers = generateAuthorizationHeader(config, uri, body);

  const response = await fetchWithRetry(`${config.baseUrl}${uri}`, {
    method: "POST",
    headers,
    body,
  });

  return response.json();
}
