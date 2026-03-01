import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateDealerCode } from "@/lib/utils";
import bcryptjs from "bcryptjs";

async function checkAdmin() {
  const session = await auth();
  const role = (session?.user as unknown as { role: string } | undefined)?.role;
  return role === "ADMIN";
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { companyName, taxNumber, taxOffice, contactName, phone, email, city, district, address, password } = body;

  const existing = await db.dealer.findFirst({
    where: { OR: [{ taxNumber }, { email }] },
  });
  if (existing) {
    return NextResponse.json({ error: "Bu vergi no veya e-posta zaten kayıtlı" }, { status: 400 });
  }

  const dealerCode = generateDealerCode();
  const passwordHash = await bcryptjs.hash(password, 12);

  const dealer = await db.dealer.create({
    data: {
      companyName,
      taxNumber,
      taxOffice,
      dealerCode,
      passwordHash,
      contactName,
      phone,
      email,
      city,
      district,
      address,
      status: "ACTIVE",
      approvedAt: new Date(),
    },
  });

  // Create notification
  await db.notification.create({
    data: {
      type: "NEW_DEALER",
      title: "Yeni Bayi Eklendi",
      message: `${companyName} (${dealerCode}) sisteme eklendi.`,
    },
  });

  return NextResponse.json(dealer, { status: 201 });
}
