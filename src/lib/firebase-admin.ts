/**
 * Firebase Admin SDK — FCM push notification gönderimi
 * Voice AI çağrı aktarma için kullanılır.
 */

// firebase-admin SDK yerine HTTP v1 API kullanıyoruz (ek paket gerekmez)
// Google OAuth2 token almak için jose kütüphanesi zaten projede var

import { SignJWT, importPKCS8 } from "jose";
import https from "https";

interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * IPv4-only HTTPS POST — Docker container'da IPv6 çalışmadığı için
 * Node.js built-in fetch (undici) yerine https modülü kullanıyoruz.
 */
function httpsPost(
  url: string,
  body: string,
  headers: Record<string, string>
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: { ...headers, "Content-Length": Buffer.byteLength(body).toString() },
        family: 4, // IPv4 only — Docker IPv6 sorunu
        timeout: 15000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode || 500, body: data }));
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("HTTPS request timeout (15s)"));
    });
    req.write(body);
    req.end();
  });
}

function getFirebaseConfig(): FirebaseConfig {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Coolify/Docker bazen \n'leri çift escape eder (\\n → \\\\n)
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/\\\\n/g, "\n")
    ?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "[Firebase] Eksik env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  }

  return { projectId, clientEmail, privateKey };
}

/**
 * Google OAuth2 access token al (service account ile)
 */
async function getAccessToken(): Promise<string> {
  // Cache kontrolü (5 dk margin ile)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300_000) {
    return cachedToken.token;
  }

  const config = getFirebaseConfig();
  const now = Math.floor(Date.now() / 1000);

  const key = await importPKCS8(config.privateKey, "RS256");

  const jwt = await new SignJWT({
    iss: config.clientEmail,
    sub: config.clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(key);

  const response = await httpsPost(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
    { "Content-Type": "application/x-www-form-urlencoded" }
  );

  if (response.status !== 200) {
    throw new Error(`[Firebase] OAuth token hatası: ${response.body}`);
  }

  const data = JSON.parse(response.body);
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * FCM ile çağrı aktarma bildirimi gönder.
 */
export async function sendCallTransferNotification(params: {
  deviceTokens: string[];
  roomName: string;
  callerNumber: string;
  summary: string;
  livekitUrl: string;
  livekitToken: string;
}): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  const config = getFirebaseConfig();
  const accessToken = await getAccessToken();

  const url = `https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`;

  const errors: string[] = [];
  let sentCount = 0;

  for (const deviceToken of params.deviceTokens) {
    try {
      const message = {
        message: {
          token: deviceToken,
          // Data-only message (arka planda da çalışır)
          data: {
            type: "call_transfer",
            roomName: params.roomName,
            callerNumber: params.callerNumber,
            summary: params.summary,
            livekitUrl: params.livekitUrl,
            livekitToken: params.livekitToken,
          },
          android: {
            priority: "high" as const,
            ttl: "60s", // 60 saniye içinde teslim edilmezse düşür
          },
        },
      };

      const response = await httpsPost(url, JSON.stringify(message), {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      });

      if (response.status >= 200 && response.status < 300) {
        sentCount++;
        console.log(
          `[Firebase] FCM gönderildi: ${deviceToken.substring(0, 20)}...`
        );
      } else {
        console.error(`[Firebase] FCM hatası: ${response.body}`);
        errors.push(`Token ${deviceToken.substring(0, 10)}: ${response.body}`);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Bilinmeyen hata";
      errors.push(`Token ${deviceToken.substring(0, 10)}: ${msg}`);
    }
  }

  return { success: sentCount > 0, sentCount, errors };
}
