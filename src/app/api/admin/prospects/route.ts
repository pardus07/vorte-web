/**
 * Vorte Admin — Potansiyel Müşteri CRUD
 * GET  /api/admin/prospects — Liste (filtre + sayfalama)
 * POST /api/admin/prospects — Yeni müşteri(ler) ekle
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

// ─── GET: Müşteri Listesi ───────────────────────────────────

export async function GET(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const category = searchParams.get("category");
  const city = searchParams.get("city");
  const status = searchParams.get("status");
  const brand = searchParams.get("brand");
  const search = searchParams.get("search");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (category) where.category = category;
  if (city) where.city = city;
  if (status) where.status = status;
  if (brand) where.brand = brand;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { contactName: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [prospects, total] = await Promise.all([
      db.prospectCustomer.findMany({
        where,
        include: {
          emails: {
            select: { id: true, status: true, openCount: true, clickCount: true, sentAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.prospectCustomer.count({ where }),
    ]);

    // İstatistikler
    const stats = await db.prospectCustomer.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    return NextResponse.json({
      prospects,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: stats.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count.id }),
        {} as Record<string, number>
      ),
    });
  } catch (error) {
    console.error("[prospects] Liste hatası:", error);
    return NextResponse.json(
      { error: "Müşteri listesi alınamadı." },
      { status: 500 }
    );
  }
}

// ─── POST: Müşteri Kaydet (tekli veya toplu) ───────────────

const prospectSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["GAS_STATION", "MARKET_CHAIN", "RETAIL_STORE", "HOTEL", "CORPORATE"]),
  brand: z.string().optional(),
  city: z.string().min(1),
  district: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  contactName: z.string().optional(),
  contactTitle: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

const bulkSchema = z.object({
  prospects: z.array(prospectSchema).min(1).max(100),
});

export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "w");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 });
  }

  // Toplu ekleme
  if (body.prospects && Array.isArray(body.prospects)) {
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz veri.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      const created = await db.prospectCustomer.createMany({
        data: parsed.data.prospects.map((p) => ({
          name: p.name,
          category: p.category,
          brand: p.brand || null,
          city: p.city,
          district: p.district || null,
          address: p.address || null,
          phone: p.phone || null,
          email: p.email || null,
          website: p.website || null,
          contactName: p.contactName || null,
          contactTitle: p.contactTitle || null,
          notes: p.notes || null,
          source: p.source || "gemini-discover",
        })),
        skipDuplicates: true,
      });

      return NextResponse.json(
        { success: true, count: created.count },
        { status: 201 }
      );
    } catch (error) {
      console.error("[prospects] Toplu ekleme hatası:", error);
      return NextResponse.json(
        { error: "Müşteriler kaydedilemedi." },
        { status: 500 }
      );
    }
  }

  // Tekli ekleme
  const parsed = prospectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const prospect = await db.prospectCustomer.create({
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
        source: parsed.data.source || "manual",
      },
    });

    return NextResponse.json({ success: true, prospect }, { status: 201 });
  } catch (error) {
    console.error("[prospects] Tekli ekleme hatası:", error);
    return NextResponse.json(
      { error: "Müşteri kaydedilemedi." },
      { status: 500 }
    );
  }
}
