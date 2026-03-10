"use server";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateDealerCode } from "@/lib/utils";
import bcryptjs from "bcryptjs";
import { z } from "zod";

const applicationSchema = z.object({
  companyName: z.string().min(2, "Firma adı en az 2 karakter olmalı"),
  taxNumber: z.string().min(10, "Vergi numarası en az 10 karakter olmalı"),
  taxOffice: z.string().min(2, "Vergi dairesi belirtilmeli"),
  contactName: z.string().min(2, "Yetkili adı en az 2 karakter olmalı"),
  phone: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  city: z.string().min(2, "Şehir belirtilmeli"),
  district: z.string().min(2, "İlçe belirtilmeli"),
  address: z.string().min(10, "Açık adres en az 10 karakter olmalı"),
  shopAddress: z.string().optional(),
  shopCity: z.string().optional(),
  shopDistrict: z.string().optional(),
  estimatedMonthlyOrder: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Lütfen tüm alanları doğru doldurunuz", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Check existing
  const existing = await db.dealer.findFirst({
    where: { OR: [{ taxNumber: data.taxNumber }, { email: data.email }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Bu vergi numarası veya e-posta adresi ile zaten bir başvuru/kayıt mevcut" },
      { status: 400 }
    );
  }

  const dealerCode = generateDealerCode();
  // Generate a temporary password (dealer will need admin approval first)
  const tempPassword = Math.random().toString(36).slice(-8);
  const passwordHash = await bcryptjs.hash(tempPassword, 12);

  const newDealer = await db.dealer.create({
    data: {
      companyName: data.companyName,
      taxNumber: data.taxNumber,
      taxOffice: data.taxOffice,
      dealerCode,
      passwordHash,
      contactName: data.contactName,
      phone: data.phone,
      email: data.email,
      city: data.city,
      district: data.district,
      address: data.address,
      shopAddress: data.shopAddress || null,
      shopCity: data.shopCity || null,
      shopDistrict: data.shopDistrict || null,
      status: "PENDING",
      notes: data.estimatedMonthlyOrder
        ? `Başvuru: Tahmini aylık sipariş: ${data.estimatedMonthlyOrder}. ${data.notes || ""}`
        : data.notes || null,
    },
  });

  // Create notification for admin
  await db.notification.create({
    data: {
      type: "NEW_DEALER",
      title: "Yeni Bayi Başvurusu",
      message: `${data.companyName} (${data.city}/${data.district}) bayi başvurusu yaptı. Onay bekliyor.`,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Başvurunuz alınmıştır. En kısa sürede tarafınıza dönüş yapılacaktır.",
    dealer: {
      id: newDealer.id,
      dealerCode: newDealer.dealerCode,
      companyName: newDealer.companyName,
      contactName: newDealer.contactName,
      phone: newDealer.phone,
      email: newDealer.email,
      city: newDealer.city,
      district: newDealer.district,
      status: newDealer.status,
    },
  }, { status: 201 });
}
