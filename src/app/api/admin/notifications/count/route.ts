import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const count = await db.notification.count({
    where: { isRead: false },
  });

  return NextResponse.json({ count });
}
