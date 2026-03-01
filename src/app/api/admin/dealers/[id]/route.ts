import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function checkAdmin() {
  const session = await auth();
  const role = (session?.user as unknown as { role: string } | undefined)?.role;
  return role === "ADMIN";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const dealer = await db.dealer.findUnique({ where: { id } });
  if (!dealer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dealer);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { companyName, taxNumber, taxOffice, contactName, phone, email, city, district, address, status } = body;

  const dealer = await db.dealer.update({
    where: { id },
    data: { companyName, taxNumber, taxOffice, contactName, phone, email, city, district, address, status },
  });

  return NextResponse.json(dealer);
}
