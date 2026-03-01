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
  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      dealer: { select: { companyName: true, dealerCode: true } },
      items: {
        include: {
          product: { select: { name: true, images: true } },
          variant: { select: { color: true, size: true, sku: true } },
        },
      },
      payment: true,
      invoice: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, cargoTrackingNo, cargoProvider } = body;

  const order = await db.order.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(cargoTrackingNo !== undefined && { cargoTrackingNo }),
      ...(cargoProvider !== undefined && { cargoProvider }),
    },
  });

  return NextResponse.json(order);
}
