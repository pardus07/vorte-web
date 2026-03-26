/**
 * Firebase Admin SDK — FCM push notification gönderimi
 * Voice AI çağrı aktarma için kullanılır.
 */

// firebase-admin SDK yerine HTTP v1 API kullanıyoruz (ek paket gerekmez)
// Google OAuth2 token almak için jose kütüphanesi zaten projede var

import { SignJWT, importPKCS8 } from "jose";

interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function getFirebaseConfig(): FirebaseConfig {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

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

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`[Firebase] OAuth token hatası: ${error}`);
  }

  const data = await response.json();
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

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (response.ok) {
        sentCount++;
        console.log(
          `[Firebase] FCM gönderildi: ${deviceToken.substring(0, 20)}...`
        );
      } else {
        const errorData = await response.text();
        console.error(`[Firebase] FCM hatası: ${errorData}`);
        errors.push(`Token ${deviceToken.substring(0, 10)}: ${errorData}`);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Bilinmeyen hata";
      errors.push(`Token ${deviceToken.substring(0, 10)}: ${msg}`);
    }
  }

  return { success: sentCount > 0, sentCount, errors };
}
