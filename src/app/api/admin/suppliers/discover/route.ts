/**
 * Vorte Admin — Supplier Discovery API
 * POST /api/admin/suppliers/discover
 *
 * Gemini API + Google Search Grounding ile Türkiye'deki tedarikçileri arar.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requirePermission } from "@/lib/admin-auth";

export const maxDuration = 60;

// ─── Types ───────────────────────────────────────────────────

type SupplierCategory =
  | "FABRIC"
  | "THREAD"
  | "ELASTIC_MALE"
  | "ELASTIC_FEMALE"
  | "LABEL"
  | "FLEXIBLE_PACKAGING"
  | "CARDBOARD_PACKAGING"
  | "CARDBOARD_STAND"
  | "SEWING_THREAD"
  | "ACCESSORY";

type Region =
  | "ALL"
  | "BURSA"
  | "ISTANBUL"
  | "DENIZLI"
  | "GAZIANTEP"
  | "ADANA"
  | "IZMIR";

interface DiscoverRequest {
  category: SupplierCategory;
  region: Region;
  customQuery?: string;
}

interface Supplier {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  products: string;
  minOrder: string;
  capacity: string;
  verified: boolean;
}

// ─── Category Prompt Mappings ────────────────────────────────

const CATEGORY_PROMPTS: Record<SupplierCategory, string> = {
  FABRIC:
    "Türkiye {region} penye süprem kumaş üreticisi toptan iç giyim konfeksiyon",
  THREAD:
    "Türkiye {region} ring combed penye iplik üreticisi toptan",
  ELASTIC_MALE:
    "Türkiye {region} jakarlı lastik bel lastiği üreticisi erkek iç giyim konfeksiyon 30-40mm",
  ELASTIC_FEMALE:
    "Türkiye {region} ince elastik lastik kadın iç giyim üreticisi 8-12mm dantel",
  LABEL:
    "Türkiye {region} dokuma etiket yıkama talimatı etiketi üreticisi konfeksiyon beden etiketi barkod",
  FLEXIBLE_PACKAGING:
    "Türkiye {region} esnek ambalaj şase poşet OPP lamine poşet üreticisi konfeksiyon tekstil",
  CARDBOARD_PACKAGING:
    "Türkiye {region} karton kutu ambalaj kartela askılı etiket sleeve üreticisi konfeksiyon",
  CARDBOARD_STAND:
    "Türkiye {region} karton stand teşhir standı üreticisi mağaza tezgah üstü ada tipi",
  SEWING_THREAD:
    "Türkiye {region} overlok dikiş ipliği reçme ipliği üreticisi konfeksiyon",
  ACCESSORY:
    "Türkiye {region} konfeksiyon aksesuar askı çengelli iğne silika jel bant sticker üreticisi",
};

const CATEGORY_DESCRIPTIONS: Record<SupplierCategory, string> = {
  FABRIC: "Süprem, Ribana, İnterlok, Modal, Likralı/Likrasız",
  THREAD: "Ring Combed, Compact, Open-End, Penye İplik",
  ELASTIC_MALE: "Jakarlı lastik (logolu), Dokuma lastik, Örme lastik 30-40mm",
  ELASTIC_FEMALE: "İnce elastik (8-12mm), Dantel lastik, Biye",
  LABEL: "Marka etiketi, Beden etiketi, Yıkama talimatı, Barkod etiketi",
  FLEXIBLE_PACKAGING:
    "Şase ambalaj (lamine poşet PET/AL/PE), OPP poşet, Zipli poşet, Dijital baskılı ambalaj",
  CARDBOARD_PACKAGING:
    "Karton kutu (tekli/çoklu), Kartela, Askılı etiket, Sleeve/bant",
  CARDBOARD_STAND:
    "Tezgah üstü (tek yönlü), Ada tipi (çift yönlü), Tam boy stand, Karton teşhir ünitesi",
  SEWING_THREAD: "Overlok ipliği, Reçme ipliği, Düz dikiş ipliği",
  ACCESSORY: "Askı, Çengelli iğne, Silika jel, Bant/sticker, Poşet klipsi",
};

const REGION_LABELS: Record<Region, string> = {
  ALL: "",
  BURSA: "Bursa",
  ISTANBUL: "İstanbul",
  DENIZLI: "Denizli",
  GAZIANTEP: "Gaziantep",
  ADANA: "Adana",
  IZMIR: "İzmir",
};

// ─── Validation ──────────────────────────────────────────────

const VALID_CATEGORIES = new Set<string>(Object.keys(CATEGORY_PROMPTS));
const VALID_REGIONS = new Set<string>(Object.keys(REGION_LABELS));

// ─── System Prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `Sen Türkiye tekstil ve konfeksiyon sektöründe tedarikçi araştırma uzmanısın.
Kullanıcının aradığı kategoride GERÇEK Türkiye'deki firmaları bul.
Her firma için şu bilgileri ver:
- Firma adı
- Adres (şehir, ilçe, OSB/sanayi bölgesi varsa)
- Telefon numarası (0XXX XXX XX XX formatında)
- E-posta adresi
- Web sitesi
- Üretim kapasitesi / ürün çeşitleri
- Minimum sipariş miktarı (varsa)

SADECE doğrulanmış, gerçek firma bilgileri ver. Emin olmadığın bilgiyi "Belirtilmemiş" yaz.

Yanıtını MUTLAKA aşağıdaki JSON formatında ver, başka hiçbir metin ekleme:
{
  "suppliers": [
    {
      "name": "Firma Adı",
      "address": "Şehir, İlçe, OSB/Bölge",
      "phone": "0XXX XXX XX XX",
      "email": "info@firma.com",
      "website": "firma.com",
      "products": "Üretim yapılan ürünler",
      "minOrder": "Minimum sipariş miktarı",
      "capacity": "Üretim kapasitesi"
    }
  ]
}`;

// ─── POST Handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  const admin = await requirePermission("products", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  }

  // API key check
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY tanımlanmamış." },
      { status: 500 }
    );
  }

  // Parse & validate body
  let body: DiscoverRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Geçersiz JSON body." },
      { status: 400 }
    );
  }

  const { category, region, customQuery } = body;

  if (!category || !VALID_CATEGORIES.has(category)) {
    return NextResponse.json(
      { error: `Geçersiz kategori. Geçerli değerler: ${[...VALID_CATEGORIES].join(", ")}` },
      { status: 400 }
    );
  }

  if (!region || !VALID_REGIONS.has(region)) {
    return NextResponse.json(
      { error: `Geçersiz bölge. Geçerli değerler: ${[...VALID_REGIONS].join(", ")}` },
      { status: 400 }
    );
  }

  // Build search query
  const regionLabel = REGION_LABELS[region];
  let searchQuery = CATEGORY_PROMPTS[category].replace(
    "{region}",
    regionLabel ? `${regionLabel} bölgesi` : ""
  );

  if (customQuery?.trim()) {
    searchQuery += ` ${customQuery.trim()}`;
  }

  const categoryDesc = CATEGORY_DESCRIPTIONS[category];
  const userPrompt = `${searchQuery}\n\nAlt kategoriler: ${categoryDesc}\n\nBu kategoride en az 5, en fazla 15 tedarikçi bul.`;

  console.log("[supplier-discover] Category:", category, "Region:", region);
  console.log("[supplier-discover] Query:", searchQuery);

  try {
    // Initialize Gemini with Google Search grounding
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      systemInstruction: SYSTEM_PROMPT,
      tools: [
        {
          // @ts-expect-error — google_search_retrieval is valid but not in SDK types
          google_search_retrieval: {
            dynamic_retrieval_config: {
              mode: "MODE_DYNAMIC",
              dynamic_threshold: 0.3,
            },
          },
        },
      ],
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

    // Parse JSON from response (strip markdown fences if present)
    let parsed: { suppliers: Supplier[] };
    try {
      const jsonStr = text
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      // Try to extract JSON object from text
      const jsonMatch = text.match(/\{[\s\S]*"suppliers"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          console.error("[supplier-discover] JSON parse failed. Raw text:", text.substring(0, 500));
          return NextResponse.json(
            { error: "Gemini yanıtı JSON formatında değil.", rawText: text.substring(0, 1000) },
            { status: 502 }
          );
        }
      } else {
        console.error("[supplier-discover] No JSON found. Raw text:", text.substring(0, 500));
        return NextResponse.json(
          { error: "Gemini yanıtı JSON formatında değil.", rawText: text.substring(0, 1000) },
          { status: 502 }
        );
      }
    }

    // Normalize supplier data
    const suppliers: Supplier[] = (parsed.suppliers || []).map((s) => ({
      name: s.name || "Belirtilmemiş",
      address: s.address || "Belirtilmemiş",
      phone: s.phone || "Belirtilmemiş",
      email: s.email || "Belirtilmemiş",
      website: s.website || "Belirtilmemiş",
      products: s.products || "Belirtilmemiş",
      minOrder: s.minOrder || "Belirtilmemiş",
      capacity: s.capacity || "Belirtilmemiş",
      verified: false,
    }));

    console.log("[supplier-discover] Found", suppliers.length, "suppliers");

    return NextResponse.json({
      suppliers,
      category,
      region,
      searchQuery,
    });
  } catch (error) {
    console.error("[supplier-discover] Gemini API error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Tedarikçi arama hatası: ${msg}` },
      { status: 500 }
    );
  }
}
