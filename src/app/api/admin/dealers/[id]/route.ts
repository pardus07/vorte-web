"use server";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { resendClient } from "@/lib/integrations/resend";
import { logActivity } from "@/lib/audit";

const updateDealerSchema = z.object({
  companyName: z.string().optional(),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  address: z.string().optional(),
  shopAddress: z.string().nullable().optional(),
  shopCity: z.string().nullable().optional(),
  shopDistrict: z.string().nullable().optional(),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
  dealerTier: z.string().optional(),
  discountRate: z.number().nullable().optional(),
  creditLimit: z.number().nullable().optional(),
  minOrderAmount: z.number().nullable().optional(),
  minOrderQuantity: z.number().nullable().optional(),
  paymentTermDays: z.number().optional(),
  notes: z.string().nullable().optional(),
  newPassword: z.string().min(6).optional(),
});

// GET — single dealer with full details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("dealers", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  const dealer = await db.dealer.findUnique({
    where: { id },
    select: {
      id: true,
      companyName: true,
      taxNumber: true,
      taxOffice: true,
      dealerCode: true,
      contactName: true,
      phone: true,
      email: true,
      city: true,
      district: true,
      address: true,
      shopAddress: true,
      shopCity: true,
      shopDistrict: true,
      discountRate: true,
      creditLimit: true,
      creditBalance: true,
      minOrderAmount: true,
      minOrderQuantity: true,
      paymentTermDays: true,
      dealerTier: true,
      status: true,
      approvedAt: true,
      approvedBy: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!dealer) return NextResponse.json({ error: "Bayi bulunamadı" }, { status: 404 });

  return NextResponse.json(dealer);
}

// PUT — update dealer
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("dealers", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateDealerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
  }

  const { newPassword, status, ...data } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = { ...data };

  // Handle status change
  if (status) {
    const current = await db.dealer.findUnique({ where: { id }, select: { status: true } });
    if (current && current.status !== status) {
      updateData.status = status;
      if (status === "ACTIVE" && current.status === "PENDING") {
        updateData.approvedAt = new Date();
        updateData.approvedBy = admin.userId;
      }
    }
  }

  // Handle password reset
  if (newPassword) {
    updateData.passwordHash = await bcryptjs.hash(newPassword, 12);
  }

  const dealer = await db.dealer.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      companyName: true,
      dealerCode: true,
      email: true,
      status: true,
      dealerTier: true,
      updatedAt: true,
    },
  });

  logActivity(
    admin.userId,
    "dealer.update",
    id,
    undefined,
    req.headers.get("x-forwarded-for") || undefined
  );

  // Bayi onay maili gönder
  if (status === "ACTIVE" && dealer.email) {
    try {
      await resendClient.sendDealerApproved(
        dealer.email,
        dealer.companyName,
        dealer.dealerCode
      );
    } catch (emailErr) {
      console.error("[Dealer] Approval email error:", emailErr);
    }
  }

  return NextResponse.json(dealer);
}

// DELETE — delete dealer
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("dealers", "d");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  // Check for active orders
  const activeOrders = await db.order.count({
    where: {
      dealerId: id,
      status: { in: ["PENDING", "PAID", "PROCESSING", "SHIPPED"] },
    },
  });

  if (activeOrders > 0) {
    return NextResponse.json(
      { error: `Bu bayinin ${activeOrders} aktif siparişi var. Önce siparişleri tamamlayın.` },
      { status: 400 }
    );
  }

  await db.dealer.delete({ where: { id } });

  logActivity(
    admin.userId,
    "dealer.delete",
    id,
    undefined,
    _req.headers.get("x-forwarded-for") || undefined
  );

  return NextResponse.json({ success: true });
}
