import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  type: z.enum(["FABRIC", "ELASTIC", "THREAD", "PACKAGING_MAT", "LABEL"]),
  address: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  materials: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  leadTimeDays: z.number().int().optional().nullable(),
  minOrderQty: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

// GET — list suppliers
export async function GET(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const active = searchParams.get("active");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (type && type !== "all") where.type = type;
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
    ];
  }

  const suppliers = await db.supplier.findMany({
    where,
    include: {
      _count: { select: { orders: true, stocks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ suppliers });
}

// POST — create supplier
export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
  }

  // Handle materials — can be JSON string or array
  let materialsData: unknown = parsed.data.materials || [];
  if (typeof materialsData === "string") {
    try { materialsData = JSON.parse(materialsData); } catch { materialsData = [materialsData]; }
  }

  // Handle empty email
  const email = parsed.data.email && parsed.data.email.trim() ? parsed.data.email.trim() : null;

  const supplier = await db.supplier.create({
    data: {
      name: parsed.data.name,
      email,
      phone: parsed.data.phone || null,
      type: parsed.data.type,
      address: parsed.data.address || null,
      contactName: parsed.data.contactName || null,
      materials: materialsData,
      leadTimeDays: parsed.data.leadTimeDays || null,
      minOrderQty: parsed.data.minOrderQty || null,
      isActive: parsed.data.isActive ?? true,
      notes: parsed.data.notes || null,
    },
  });

  return NextResponse.json(supplier, { status: 201 });
}
