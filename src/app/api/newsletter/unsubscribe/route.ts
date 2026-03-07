import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHmac } from "crypto";

function verifyUnsubscribeToken(email: string, token: string): boolean {
  const secret = process.env.NEXTAUTH_SECRET || "secret";
  const expected = createHmac("sha256", secret)
    .update(email)
    .digest("hex")
    .slice(0, 32);
  return token === expected;
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  const token = request.nextUrl.searchParams.get("token");

  if (!email || !token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!verifyUnsubscribeToken(email, token)) {
    return NextResponse.redirect(new URL("/?error=invalid-token", request.url));
  }

  try {
    // Soft-delete: mark as inactive (preserves history)
    await db.newsletterSubscriber.updateMany({
      where: { email: email.toLowerCase() },
      data: { active: false },
    });

    // Redirect to unsubscribe confirmation page
    return NextResponse.redirect(new URL("/abonelik-iptal", request.url));
  } catch (error) {
    console.error("[Unsubscribe] Error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
