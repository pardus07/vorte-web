import { NextResponse } from "next/server";
import { clearDealerSession } from "@/lib/dealer-session";

export async function GET() {
  await clearDealerSession();
  return NextResponse.redirect(new URL("/bayi-girisi", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}
