/**
 * Vorte Admin — Adres → Koordinat (Geocoding)
 * POST /api/admin/prospects/geocode
 *
 * OpenStreetMap Nominatim API ile adresi koordinata çevirir.
 * 7 farklı arama stratejisi dener: isim, yapısal, basitleştirilmiş, ham, cadde, ilçe, sadece şehir.
 * Ücretsiz, API key gerektirmez.
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";

// Türkçe kısaltmaları temizle
function simplifyAddress(addr: string): string {
  return addr
    .replace(/\bMh\.\s*/gi, "Mahallesi ")
    .replace(/\bMah\.\s*/gi, "Mahallesi ")
    .replace(/\bCd\.\s*/gi, "Caddesi ")
    .replace(/\bCad\.\s*/gi, "Caddesi ")
    .replace(/\bSk\.\s*/gi, "Sokak ")
    .replace(/\bSok\.\s*/gi, "Sokak ")
    .replace(/\bBlv\.\s*/gi, "Bulvarı ")
    .replace(/\bNo:\s*\d*/gi, "")
    .replace(/\bSit\.\s*/gi, "Sitesi ")
    .replace(/\bKat:\s*\d*/gi, "")
    .replace(/\bD:\s*\d*/gi, "")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

// Adresten ilçe, mahalle, cadde bilgisi çıkar
function parseAddressParts(addr: string, city?: string): {
  district: string | null;
  neighborhood: string | null;
  street: string | null;
} {
  let district: string | null = null;
  let neighborhood: string | null = null;
  let street: string | null = null;

  // İlçe: Bilinen Bursa ilçeleri ve genel pattern
  const bursaknownDistricts = ["Nilüfer", "Osmangazi", "Yıldırım", "Mudanya", "Gemlik", "İnegöl", "Karacabey", "Mustafakemalpaşa", "Orhangazi", "Kestel", "Gürsu"];
  const parts = addr.split(/[,،]+/).map(s => s.trim());

  for (const part of parts) {
    // İlçe bul
    for (const d of bursaknownDistricts) {
      if (part.toLowerCase().includes(d.toLowerCase())) {
        district = d;
        break;
      }
    }
    // Mahalle bul
    if (/\b(Mh\.?|Mah\.?|Mahallesi)\b/i.test(part)) {
      neighborhood = part
        .replace(/\b(Mh\.?|Mah\.?)\b/gi, "Mahallesi")
        .trim();
    }
    // Cadde/Sokak/Bulvar bul
    if (/\b(Cd\.?|Cad\.?|Caddesi|Sk\.?|Sok\.?|Sokak|Blv\.?|Bulvarı|Yolu)\b/i.test(part)) {
      street = part
        .replace(/\bCd\.?\s*/gi, "Caddesi ")
        .replace(/\bCad\.?\s*/gi, "Caddesi ")
        .replace(/\bSk\.?\s*/gi, "Sokak ")
        .replace(/\bSok\.?\s*/gi, "Sokak ")
        .replace(/\bBlv\.?\s*/gi, "Bulvarı ")
        .replace(/\bNo:\s*\d*/gi, "")
        .trim();
    }
  }

  // İlçe: "Bursa, Nilüfer, ..." formatında şehir-ilçe ayrımı
  if (!district && city) {
    for (const part of parts) {
      const clean = part.trim();
      if (clean !== city && clean.length > 2 && !/(Mh|Mah|Cd|Cad|Sk|Sok|Blv|No)/i.test(clean)) {
        // Şehir değilse ve adres parçası değilse ilçe olabilir
        if (bursaknownDistricts.some(d => clean.toLowerCase() === d.toLowerCase())) {
          district = clean;
          break;
        }
      }
    }
  }

  return { district, neighborhood, street };
}

// Serbest metin arama
async function searchNominatim(query: string): Promise<{ lat: number; lon: number; display_name: string } | null> {
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

  if (!res.ok) return null;

  const results = await res.json();
  if (!results || results.length === 0) return null;

  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
    display_name: results[0].display_name,
  };
}

// Yapısal arama (structured search — daha iyi sonuç verir)
async function searchNominatimStructured(params: {
  street?: string;
  city?: string;
  county?: string; // ilçe
  country?: string;
}): Promise<{ lat: number; lon: number; display_name: string } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "tr");
  url.searchParams.set("addressdetails", "1");

  if (params.street) url.searchParams.set("street", params.street);
  if (params.city) url.searchParams.set("city", params.city);
  if (params.county) url.searchParams.set("county", params.county);
  if (params.country) url.searchParams.set("country", params.country);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Vorte-CRM/1.0 (info@vorte.com.tr)",
      "Accept-Language": "tr",
    },
  });

  if (!res.ok) return null;

  const results = await res.json();
  if (!results || results.length === 0) return null;

  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
    display_name: results[0].display_name,
  };
}

function makeResponse(result: { lat: number; lon: number; display_name: string }, strategy: string) {
  return NextResponse.json({
    latitude: result.lat,
    longitude: result.lon,
    displayName: result.display_name,
    strategy,
  });
}

export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  }

  let body: { address: string; city?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 });
  }

  const { address, city, name } = body;
  if ((!address || address.trim().length < 3) && (!name || name.trim().length < 3)) {
    return NextResponse.json({ error: "Adres veya işletme adı gerekli." }, { status: 400 });
  }

  // Adres parçalarını çıkar
  const addrParts = address ? parseAddressParts(address, city) : { district: null, neighborhood: null, street: null };

  try {
    // Strateji 1: İşletme adı + şehir (benzin istasyonları OSM'de isimle kayıtlı)
    if (name) {
      const nameQuery = city ? `${name}, ${city}, Türkiye` : `${name}, Türkiye`;
      console.log("[geocode] Strateji 1 (isim):", nameQuery);
      const result = await searchNominatim(nameQuery);
      if (result) return makeResponse(result, "name");
    }

    // Strateji 2: Yapısal arama — cadde + ilçe + şehir (en doğru sonuç)
    if (addrParts.street && city) {
      console.log("[geocode] Strateji 2 (yapısal):", { street: addrParts.street, county: addrParts.district, city });
      const result = await searchNominatimStructured({
        street: addrParts.street,
        city,
        county: addrParts.district || undefined,
        country: "Turkey",
      });
      if (result) return makeResponse(result, "structured");
    }

    // Strateji 3: Basitleştirilmiş adres + şehir
    if (address) {
      const simplified = simplifyAddress(address);
      const simplifiedQuery = city ? `${simplified}, ${city}, Türkiye` : `${simplified}, Türkiye`;
      console.log("[geocode] Strateji 3 (basit adres):", simplifiedQuery);
      const result = await searchNominatim(simplifiedQuery);
      if (result) return makeResponse(result, "simplified_address");
    }

    // Strateji 4: Ham adres + şehir
    if (address) {
      const rawQuery = city ? `${address}, ${city}, Türkiye` : `${address}, Türkiye`;
      console.log("[geocode] Strateji 4 (ham adres):", rawQuery);
      const result = await searchNominatim(rawQuery);
      if (result) return makeResponse(result, "raw_address");
    }

    // Strateji 5: Sadece cadde/bulvar adı + şehir
    if (address && city) {
      // Adresten cadde/yol kısmını bul
      const streetMatch = address.match(/(İzmir Yolu|Ankara Yolu|Mudanya Yolu|Yalova Yolu|Istanbul Yolu|Eskişehir Yolu|[A-ZÇĞİÖŞÜa-zçğıöşü]+ (?:Cad|Cd|Blv|Bulvarı|Caddesi|Yolu)[^,]*)/)
        || address.match(/([A-ZÇĞİÖŞÜ][a-zçğıöşü]+ (?:Yolu|Bulvarı|Caddesi|Sokak|Sokağı))/);
      if (streetMatch) {
        const streetName = streetMatch[0]
          .replace(/\bCd\.?\s*/gi, "Caddesi ")
          .replace(/\bCad\.?\s*/gi, "Caddesi ")
          .replace(/\bBlv\.?\s*/gi, "Bulvarı ")
          .replace(/\bNo:\s*\d*/gi, "")
          .trim();
        const streetQuery = addrParts.district
          ? `${streetName}, ${addrParts.district}, ${city}`
          : `${streetName}, ${city}`;
        console.log("[geocode] Strateji 5 (cadde):", streetQuery);
        const result = await searchNominatim(streetQuery);
        if (result) return makeResponse(result, "street");
      }
    }

    // Strateji 6: İlçe + şehir (yaklaşık konum)
    if (addrParts.district && city) {
      const districtQuery = `${addrParts.district}, ${city}, Türkiye`;
      console.log("[geocode] Strateji 6 (ilçe):", districtQuery);
      const result = await searchNominatim(districtQuery);
      if (result) return makeResponse(result, "district");
    }

    // Strateji 7: İsim + ilçe + şehir (işletme adını ilçeyle birleştir)
    if (name && addrParts.district && city) {
      const nameDistrictQuery = `${name}, ${addrParts.district}, ${city}`;
      console.log("[geocode] Strateji 7 (isim+ilçe):", nameDistrictQuery);
      const result = await searchNominatim(nameDistrictQuery);
      if (result) return makeResponse(result, "name_district");
    }

    // Hiçbir strateji çalışmadı
    console.log("[geocode] Tüm stratejiler başarısız:", { name, address, city, parsed: addrParts });
    return NextResponse.json({
      error: "Bu adres için koordinat bulunamadı. Adresi daha detaylı girmeyi veya elle koordinat girmeyi deneyin.",
      latitude: null,
      longitude: null,
    });
  } catch (error) {
    console.error("[geocode] Nominatim error:", error);
    return NextResponse.json(
      { error: "Koordinat arama hatası." },
      { status: 500 }
    );
  }
}
