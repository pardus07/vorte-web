import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Tek seferlik GTIN migration endpoint'i
// POST /api/admin/migrate-gtins
// Header: Authorization: Bearer <CRON_SECRET>

const GTIN_MAP: Record<string, string> = {
  "VRT-MBX-SYH-S": "8685094180009",
  "VRT-MBX-SYH-M": "8685094180016",
  "VRT-MBX-SYH-L": "8685094180023",
  "VRT-MBX-SYH-XL": "8685094180030",
  "VRT-MBX-SYH-XXL": "8685094180047",
  "VRT-MBX-LCV-S": "8685094180054",
  "VRT-MBX-LCV-M": "8685094180061",
  "VRT-MBX-LCV-L": "8685094180078",
  "VRT-MBX-LCV-XL": "8685094180085",
  "VRT-MBX-LCV-XXL": "8685094180092",
  "VRT-MBX-GRI-S": "8685094180108",
  "VRT-MBX-GRI-M": "8685094180115",
  "VRT-MBX-GRI-L": "8685094180122",
  "VRT-MBX-GRI-XL": "8685094180139",
  "VRT-MBX-GRI-XXL": "8685094180146",
  "VRT-MKL-SYH-S": "8685094180153",
  "VRT-MKL-SYH-M": "8685094180160",
  "VRT-MKL-SYH-L": "8685094180177",
  "VRT-MKL-SYH-XL": "8685094180184",
  "VRT-MKL-SYH-XXL": "8685094180191",
  "VRT-MKL-BYZ-S": "8685094180207",
  "VRT-MKL-BYZ-M": "8685094180214",
  "VRT-MKL-BYZ-L": "8685094180221",
  "VRT-MKL-BYZ-XL": "8685094180238",
  "VRT-MKL-BYZ-XXL": "8685094180245",
  "VRT-MKL-TEN-S": "8685094180252",
  "VRT-MKL-TEN-M": "8685094180269",
  "VRT-MKL-TEN-L": "8685094180276",
  "VRT-MKL-TEN-XL": "8685094180283",
  "VRT-MKL-TEN-XXL": "8685094180290",
};

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { sku: string; gtin: string; status: string }[] = [];

  for (const [sku, gtin] of Object.entries(GTIN_MAP)) {
    try {
      const variant = await db.variant.findFirst({ where: { sku } });
      if (!variant) {
        results.push({ sku, gtin, status: "NOT_FOUND" });
        continue;
      }
      if (variant.gtinBarcode === gtin) {
        results.push({ sku, gtin, status: "ALREADY_SET" });
        continue;
      }
      await db.variant.update({
        where: { id: variant.id },
        data: { gtinBarcode: gtin },
      });
      results.push({ sku, gtin, status: "UPDATED" });
    } catch (error) {
      results.push({ sku, gtin, status: `ERROR: ${error}` });
    }
  }

  const updated = results.filter((r) => r.status === "UPDATED").length;
  const alreadySet = results.filter((r) => r.status === "ALREADY_SET").length;
  const notFound = results.filter((r) => r.status === "NOT_FOUND").length;

  return NextResponse.json({
    message: `GTIN migration complete: ${updated} updated, ${alreadySet} already set, ${notFound} not found`,
    results,
  });
}
