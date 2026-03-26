/**
 * Vorte Admin — Müşteri Keşfet API
 * POST /api/admin/prospects/discover
 *
 * Gemini 2.5 Flash + Google Search ile potansiyel müşterileri (benzin istasyonu, market vb.) arar.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requirePermission } from "@/lib/admin-auth";

export const maxDuration = 60;

// ─── Types ───────────────────────────────────────────────────

type ProspectCategory =
  | "GAS_STATION"
  | "MARKET_CHAIN"
  | "RETAIL_STORE"
  | "HOTEL"
  | "CORPORATE";

interface DiscoverRequest {
  category: ProspectCategory;
  city: string;
  brand?: string;
  customQuery?: string;
}

interface ProspectResult {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  contactName: string;
  contactTitle: string;
  brand: string;
}

// ─── Kategori Arama Promptları ──────────────────────────────

const CATEGORY_PROMPTS: Record<ProspectCategory, string> = {
  GAS_STATION: "{brand} benzin istasyonu {city} iletişim bilgileri adres telefon e-posta yetkili",
  MARKET_CHAIN: "{brand} market süpermarket {city} bölge müdürlüğü iletişim satın alma",
  RETAIL_STORE: "iç giyim mağazası tekstil perakende satış noktası {city} iletişim",
  HOTEL: "otel {city} satın alma departmanı iletişim bilgileri",
  CORPORATE: "kurumsal iç giyim toptan alım {city} firma iletişim",
};

const CATEGORY_LABELS: Record<ProspectCategory, string> = {
  GAS_STATION: "Benzin İstasyonu",
  MARKET_CHAIN: "Market Zinciri",
  RETAIL_STORE: "Perakende Mağaza",
  HOTEL: "Otel",
  CORPORATE: "Kurumsal",
};

const BRAND_OPTIONS: Record<ProspectCategory, string[]> = {
  GAS_STATION: ["Shell", "BP", "Opet", "Total", "Petrol Ofisi", "Aytemiz", "TP"],
  MARKET_CHAIN: ["A101", "BİM", "ŞOK", "Migros", "CarrefourSA", "File"],
  RETAIL_STORE: [],
  HOTEL: [],
  CORPORATE: [],
};

// ─── Şehir listesi ──────────────────────────────────────────

const VALID_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya",
  "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik",
  "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum",
  "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir",
  "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul",
  "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kırıkkale",
  "Kırklareli", "Kırşehir", "Kilis", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa",
  "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize",
  "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop", "Sivas", "Şırnak", "Tekirdağ",
  "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
];

// ─── System Prompt ──────────────────────────────────────────

const SYSTEM_PROMPT = `Sen Türkiye'deki işletmeleri araştıran bir uzman asistansın.
Kullanıcının aradığı kategoride GERÇEK Türkiye'deki işletmeleri bul.
Her işletme için şu bilgileri ver:
- İşletme adı (tam ticari unvanı veya tabela adı)
- Adres (şehir, ilçe, mahalle/cadde)
- Telefon numarası (0XXX XXX XX XX formatında)
- E-posta adresi (varsa)
- Web sitesi (varsa)
- Yetkili kişi adı (müdür, sahip vb.)
- Yetkili unvanı (İstasyon Müdürü, Mağaza Müdürü vb.)
- Marka/zincir (Shell, BP, Opet vb. veya bağımsız)

SADECE doğrulanmış, gerçek işletme bilgileri ver. Emin olmadığın bilgiyi "Belirtilmemiş" yaz.

Yanıtını MUTLAKA aşağıdaki JSON formatında ver, başka hiçbir metin ekleme:
{
  "prospects": [
    {
      "name": "İşletme Adı",
      "address": "Şehir, İlçe, Mahalle/Cadde",
      "phone": "0XXX XXX XX XX",
      "email": "iletisim@firma.com",
      "website": "firma.com",
      "contactName": "Yetkili Ad Soyad",
      "contactTitle": "İstasyon Müdürü",
      "brand": "Shell"
    }
  ]
}`;

// ─── POST Handler ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY tanımlanmamış." },
      { status: 500 }
    );
  }

  let body: DiscoverRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON body." }, { status: 400 });
  }

  const { category, city, brand, customQuery } = body;

  if (!category || !CATEGORY_PROMPTS[category]) {
    return NextResponse.json(
      { error: `Geçersiz kategori. Geçerli: ${Object.keys(CATEGORY_PROMPTS).join(", ")}` },
      { status: 400 }
    );
  }

  if (!city || !VALID_CITIES.includes(city)) {
    return NextResponse.json(
      { error: "Geçersiz şehir." },
      { status: 400 }
    );
  }

  // Prompt oluştur
  let searchQuery = CATEGORY_PROMPTS[category]
    .replace("{city}", city)
    .replace("{brand}", brand || "");

  if (customQuery?.trim()) {
    searchQuery += ` ${customQuery.trim()}`;
  }

  const categoryLabel = CATEGORY_LABELS[category];
  const userPrompt = `${searchQuery}\n\nKategori: ${categoryLabel}\nŞehir: ${city}${brand ? `\nMarka: ${brand}` : ""}\n\nBu kriterlere uyan en az 5, en fazla 15 işletme bul.`;

  console.log("[prospect-discover] Category:", category, "City:", city, "Brand:", brand);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(userPrompt);
    const response = result.response;

    let text = "";
    try {
      text = response.text();
    } catch {
      return NextResponse.json(
        { error: "Gemini'den yanıt alınamadı." },
        { status: 502 }
      );
    }

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Gemini boş yanıt döndü." },
        { status: 502 }
      );
    }

    // JSON parse
    let parsed: { prospects: ProspectResult[] };
    try {
      const jsonStr = text
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*"prospects"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          console.error("[prospect-discover] JSON parse failed:", text.substring(0, 500));
          return NextResponse.json(
            { error: "Gemini yanıtı JSON formatında değil.", rawText: text.substring(0, 1000) },
            { status: 502 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Gemini yanıtı JSON formatında değil.", rawText: text.substring(0, 1000) },
          { status: 502 }
        );
      }
    }

    // Normalize
    const prospects: ProspectResult[] = (parsed.prospects || []).map((p) => ({
      name: p.name || "Belirtilmemiş",
      address: p.address || "Belirtilmemiş",
      phone: p.phone || "Belirtilmemiş",
      email: p.email || "Belirtilmemiş",
      website: p.website || "Belirtilmemiş",
      contactName: p.contactName || "Belirtilmemiş",
      contactTitle: p.contactTitle || "Belirtilmemiş",
      brand: p.brand || brand || "Belirtilmemiş",
    }));

    console.log("[prospect-discover] Found", prospects.length, "prospects");

    return NextResponse.json({
      prospects,
      category,
      city,
      brand,
      brands: BRAND_OPTIONS[category] || [],
    });
  } catch (error) {
    console.error("[prospect-discover] Gemini API error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Müşteri arama hatası: ${msg}` },
      { status: 500 }
    );
  }
}

// ─── GET: Marka ve şehir listesini döndür ───────────────────

export async function GET() {
  return NextResponse.json({
    categories: CATEGORY_LABELS,
    brands: BRAND_OPTIONS,
    cities: VALID_CITIES,
  });
}
