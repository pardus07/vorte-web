import { NextResponse } from "next/server";
import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getDealerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dealer = await db.dealer.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      companyName: true,
      contactName: true,
      email: true,
      phone: true,
      city: true,
      district: true,
      address: true,
      taxNumber: true,
      taxOffice: true,
      dealerCode: true,
      dealerTier: true,
      status: true,
      minOrderAmount: true,
      minOrderQuantity: true,
      discountRate: true,
      creditLimit: true,
      creditBalance: true,
      paymentTermDays: true,
    },
  });

  if (!dealer) {
    return NextResponse.json({ error: "Bayi bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(dealer);
}
