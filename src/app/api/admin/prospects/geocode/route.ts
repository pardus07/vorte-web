/**
 * Vorte Admin — Adres → Koordinat (Geocoding)
 * POST /api/admin/prospects/geocode
 *
 * OpenStreetMap Nominatim API ile adresi koordinata çevirir.
 * Ücretsiz, API key gerektirmez.
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  }

  let body: { address: string; city?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 });
  }

  const { address, city } = body;
  if (!address || address.trim().length < 3) {
    return NextResponse.json({ error: "Adres gerekli (en az 3 karakter)." }, { status: 400 });
  }

  // Adresi zenginleştir
  const query = city ? `${address}, ${city}, Türkiye` : `${address}, Türkiye`;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "tr");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Vorte-CRM/1.0 (info@vorte.com.tr)",
        "Accept-Language": "tr",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Nominatim servisinden yanıt alınamadı." },
        { status: 502 }
      );
    }

    const results = await res.json();

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: "Bu adres için koordinat bulunamadı.", latitude: null, longitude: null },
        { status: 200 }
      );
    }

    const result = results[0];
    return NextResponse.json({
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    });
  } catch (error) {
    console.error("[geocode] Nominatim error:", error);
    return NextResponse.json(
      { error: "Koordinat arama hatası." },
      { status: 500 }
    );
  }
}
