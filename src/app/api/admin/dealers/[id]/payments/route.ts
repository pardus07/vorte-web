"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(["payment", "debt", "refund"]),
  method: z.string().optional(),
  description: z.string().optional(),
});

// GET — dealer payment history (cari hesap hareketleri)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("dealers", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const [payments, total, dealer] = await Promise.all([
    db.dealerPayment.findMany({
      where: { dealerId: id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.dealerPayment.count({ where: { dealerId: id } }),
    db.dealer.findUnique({
      where: { id },
      select: { creditBalance: true, creditLimit: true },
    }),
  ]);

  return NextResponse.json({
    payments,
    total,
    creditBalance: dealer?.creditBalance || 0,
    creditLimit: dealer?.creditLimit || null,
  });
}

// POST — create manual payment record + update balance
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("dealers", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  const { amount, type, method, description } = parsed.data;

  // payment reduces balance, debt increases balance
  const balanceChange = type === "payment" || type === "refund" ? -amount : amount;

  const [payment] = await db.$transaction([
    db.dealerPayment.create({
      data: {
        dealerId: id,
        amount,
        type,
        method,
        description: description || (type === "payment" ? "Manuel ödeme kaydı" : type === "debt" ? "Borç kaydı" : "İade kaydı"),
      },
    }),
    db.dealer.update({
      where: { id },
      data: { creditBalance: { increment: balanceChange } },
    }),
  ]);

  return NextResponse.json(payment, { status: 201 });
}
