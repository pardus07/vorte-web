import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { DealerSession } from "@/types";

const DEALER_JWT_SECRET = process.env.DEALER_JWT_SECRET || "dev-secret";
const DEALER_COOKIE_NAME = "dealer-session";

export function createDealerToken(dealer: DealerSession): string {
  return jwt.sign(dealer, DEALER_JWT_SECRET, { expiresIn: "7d" });
}

export function verifyDealerToken(token: string): DealerSession | null {
  try {
    return jwt.verify(token, DEALER_JWT_SECRET) as DealerSession;
  } catch {
    return null;
  }
}

export async function getDealerSession(): Promise<DealerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEALER_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyDealerToken(token);
}

export async function setDealerSession(dealer: DealerSession): Promise<void> {
  const token = createDealerToken(dealer);
  const cookieStore = await cookies();
  cookieStore.set(DEALER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearDealerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEALER_COOKIE_NAME);
}
