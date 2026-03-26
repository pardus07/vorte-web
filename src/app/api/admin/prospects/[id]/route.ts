/**
 * Vorte Admin — Potansiyel Müşteri Detay
 * GET    /api/admin/prospects/[id] — Detay
 * PUT    /api/admin/prospects/[id] — Güncelle
 * DELETE /api/admin/prospects/[id] — Sil
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

type Params = { params: Promise<{ id: string }> };

// ─── GET: Detay ─────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const prospect = await db.prospectCustomer.findUnique({
      where: { id },
      include: {
        emails: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Müşteri bulunamadı." }, { status: 404 });
    }

    return NextResponse.json(prospect);
  } catch (error) {
    console.error("[prospects] Detay hatası:", error);
    return NextResponse.json({ error: "Müşteri bilgisi alınamadı." }, { status: 500 });
  }
}

// ─── PUT: Güncelle ──────────────────────────────────────────

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(["GAS_STATION", "MARKET_CHAIN", "RETAIL_STORE", "HOTEL", "CORPORATE"]).optional(),
  brand: z.string().nullable().optional(),
  city: z.string().optional(),
  district: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  website: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactTitle: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  status: z.enum([
    "NEW", "CONTACTED", "OPENED", "CLICKED", "INTERESTED",
    "SAMPLE_SENT", "CONVERTED", "REJECTED",
  ]).optional(),
  notes: z.string().nullable().optional(),
});

export async function PUT(req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "w");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  }

  const { id } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const prospect = await db.prospectCustomer.update({
      where: { id },
      data: {
        ...parsed.data,
        email: parsed.data.email === "" ? null : parsed.data.email,
      },
    });

    return NextResponse.json({ success: true, prospect });
  } catch (error) {
    console.error("[prospects] Güncelleme hatası:", error);
    return NextResponse.json({ error: "Müşteri güncellenemedi." }, { status: 500 });
  }
}

// ─── DELETE: Sil ────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await requirePermission("products", "w");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  }

  const { id } = await params;

  try {
    await db.prospectCustomer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[prospects] Silme hatası:", error);
    return NextResponse.json({ error: "Müşteri silinemedi." }, { status: 500 });
  }
}
