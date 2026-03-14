import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["FABRIC", "ELASTIC", "THREAD", "PACKAGING_MAT", "LABEL"]),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  minQuantity: z.number().min(0),
  supplierId: z.string().optional(),
});

// GET — list material stocks (with low stock alerts)
export async function GET(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const lowStock = searchParams.get("lowStock");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (type && type !== "all") where.type = type;

  const stocks = await db.materialStock.findMany({
    where,
    include: {
      supplier: { select: { name: true, email: true } },
    },
    orderBy: { name: "asc" },
  });

  // Filter low stock if requested
  const filtered = lowStock === "true"
    ? stocks.filter((s) => s.quantity <= s.minQuantity)
    : stocks;

  // Count alerts
  const alerts = stocks.filter((s) => s.quantity <= s.minQuantity).length;

  return NextResponse.json({ stocks: filtered, total: filtered.length, alerts });
}

// POST — create material stock entry
export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
  }

  const stock = await db.materialStock.create({
    data: {
      ...parsed.data,
      lastRestocked: new Date(),
    },
    include: { supplier: { select: { name: true } } },
  });

  return NextResponse.json(stock, { status: 201 });
}
