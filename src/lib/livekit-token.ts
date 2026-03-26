/**
 * LiveKit Access Token üretimi — jose ile (ek paket gerekmez).
 * Android app'in LiveKit room'a katılması için token oluşturur.
 */

import { SignJWT } from "jose";

interface LiveKitTokenOptions {
  identity: string; // Katılımcı kimliği (ör: "operator-ibrahim")
  roomName: string; // Katılacağı room adı
  ttl?: number; // Token geçerlilik süresi (saniye, default: 3600)
}

/**
 * LiveKit Access Token oluştur.
 * LIVEKIT_API_KEY ve LIVEKIT_API_SECRET env var'ları gerekli.
 */
export async function generateLiveKitToken(
  options: LiveKitTokenOptions
): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "[LiveKit] LIVEKIT_API_KEY ve LIVEKIT_API_SECRET env var'ları gerekli"
    );
  }

  const { identity, roomName, ttl = 3600 } = options;
  const now = Math.floor(Date.now() / 1000);

  // LiveKit JWT formatı: HS256, sub=identity, video claim
  const secret = new TextEncoder().encode(apiSecret);

  const token = await new SignJWT({
    sub: identity,
    iss: apiKey,
    nbf: now,
    exp: now + ttl,
    jti: `${identity}-${Date.now()}`,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(secret);

  return token;
}

/**
 * LiveKit sunucu URL'ini al.
 * Android app WebSocket (wss://) ile bağlanır.
 */
export function getLiveKitUrl(): string {
  // Production'da sunucu ws://localhost:7880 kullanır
  // Ancak Android app dışarıdan bağlanır, public URL lazım
  const publicUrl = process.env.LIVEKIT_PUBLIC_URL;
  if (publicUrl) return publicUrl;

  // Fallback: sunucu IP + port
  return process.env.LIVEKIT_URL || "ws://localhost:7880";
}
