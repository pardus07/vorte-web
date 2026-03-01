import crypto from "crypto";

const API_KEY = process.env.IYZICO_API_KEY || "";
const SECRET_KEY = process.env.IYZICO_SECRET_KEY || "";
const BASE_URL = process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com";

function generateAuthorizationHeader(uri: string, body: string = ""): Record<string, string> {
  const randomString = crypto.randomBytes(8).toString("hex");
  const payload = randomString + uri + body;
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payload)
    .digest("hex");
  const authorizationString = `apiKey:${API_KEY}&randomKey:${randomString}&signature:${signature}`;
  const base64Auth = Buffer.from(authorizationString).toString("base64");

  return {
    Authorization: `IYZWSv2 ${base64Auth}`,
    "Content-Type": "application/json",
    "x-iyzi-rnd": randomString,
  };
}

export interface IyzicoPaymentRequest {
  conversationId: string;
  price: string;
  paidPrice: string;
  currency: string;
  installment: string;
  basketId: string;
  paymentChannel: string;
  paymentGroup: string;
  callbackUrl: string;
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
  const uri = "/payment/iosInit/initialize/pay/3ds";
  const body = JSON.stringify(data);
  const headers = generateAuthorizationHeader(uri, body);

  const response = await fetch(`${BASE_URL}${uri}`, {
    method: "POST",
    headers,
    body,
  });

  return response.json();
}

export async function retrievePaymentResult(token: string) {
  const uri = "/payment/iosInit/3ds";
  const body = JSON.stringify({ token });
  const headers = generateAuthorizationHeader(uri, body);

  const response = await fetch(`${BASE_URL}${uri}`, {
    method: "POST",
    headers,
    body,
  });

  return response.json();
}
