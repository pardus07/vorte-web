import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ categories });
}
