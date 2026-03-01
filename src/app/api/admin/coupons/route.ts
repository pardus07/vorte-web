import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function checkAdmin() {
  const session = await auth();
  const role = (session?.user as unknown as { role: string } | undefined)?.role;
  return role === "ADMIN";
}

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(coupons);
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const coupon = await db.coupon.create({
    data: {
      code: body.code,
      discountType: body.discountType,
      discountValue: body.discountValue,
      minAmount: body.minAmount,
      maxUses: body.maxUses,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  });

  return NextResponse.json(coupon, { status: 201 });
}
