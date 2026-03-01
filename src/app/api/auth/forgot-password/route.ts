import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: "E-posta gereklidir" }, { status: 400 });
  }

  // Check if user exists (but always return success to prevent email enumeration)
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (user) {
    // TODO: Send password reset email via Resend
    // For now, just log it
    console.log(`Password reset requested for: ${email}`);
  }

  // Always return success to prevent email enumeration
  return NextResponse.json({ success: true });
}
