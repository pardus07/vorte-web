/**
 * Vorte Tekstil — BOM (Bill of Materials) Hesaplama Motoru
 *
 * Excel formüllerinin birebir TypeScript karşılığı.
 * Kaynak: vorte_uretim_planlama_v2.xlsx
 *
 * Formüller:
 *   Kumaş: netAlan = kalıpBoyu × yarımGenişlik × 2 / 10000 (m²)
 *          fireDahil = netAlan × 1.10
 *          ağırlık = fireDahil × GSM (gr)
 *   Lastik: bel = (belÇevresi + 3) / 100 × grPerMetre
 *           paça = ((paçaÇevresi + 3) × 2) / 100 × grPerMetre
 *   İplik:  overlok = dikişUz × 4, düzDikiş = 50×2.5 (E) / 40×2.5 (K)
 *           ağırlık = toplamMetre × 0.3
 */

// ─── SABİT PARAMETRELER ─────────────────────────────────────

export const PRODUCTION_CONSTANTS = {
  // Kumaş
  GSM: 190,                    // gr/m² (araştırma ile kesinleşti)
  FABRIC_WIDTH_CM: 152,        // Açık en (cm)
  WASTE_RATE: 0.10,            // %10 kesim+serim fire
  INNER_LINING_GSM: 140,       // Kadın iç katman GSM

  // Lastik
  ELASTIC: {
    MALE_WAIST_WIDTH_CM: 4,          // Erkek bel lastiği genişliği
    MALE_WAIST_WEIGHT_PER_M: 3.8,    // gr/m — Jacquard Vorte logolu
    FEMALE_WAIST_WIDTH_CM: 1.5,      // Kadın bel lastiği genişliği
    FEMALE_WAIST_WEIGHT_PER_M: 1.5,  // gr/m — ince, görünmez
    MALE_LEG_WIDTH_CM: 1,            // Erkek paça lastiği genişliği
    MALE_LEG_WEIGHT_PER_M: 1.2,      // gr/m
    FEMALE_LEG_WIDTH_CM: 0.8,        // Kadın bacak lastiği genişliği
    FEMALE_LEG_WEIGHT_PER_M: 1.0,    // gr/m
    SEAM_ALLOWANCE_CM: 3,            // Ekleme payı (her uç)
  },

  // İplik
  THREAD_WEIGHT_PER_M: 0.3,   // gr/m — dikiş ipliği
  MALE_FLAT_STITCH_CM: 125,   // Erkek düz dikiş (50cm × 2.5)
  FEMALE_FLAT_STITCH_CM: 100, // Kadın düz dikiş (40cm × 2.5)

  // Aksesuar
  LABEL_WEIGHT: 1,            // gr — yıkama talimat etiketi
  PACKAGING_WEIGHT_MALE: 7,   // gr — ambalaj poşet (2) + karton insert (5)
  PACKAGING_WEIGHT_FEMALE: 5.5, // gr — ambalaj poşet (1.5) + karton insert (4)
} as const;

// ─── BEDEN LOOKUP TABLOLARI ────────────────────────────────

type SizeKey = "S" | "M" | "L" | "XL" | "XXL";

interface MaleBoxerSize {
  kalipBoyCm: number;
  yarimGenCm: number;
  belCevresiCm: number;
  pacaCevresiCm: number;
  dikisUzCm: number;
}

interface FemalePantySize {
  kalipBoyCm: number;
  yarimGenCm: number;
  belCevresiCm: number;
  bacakAciklikCm: number;
  icKatmanAlani: number; // m²
  dikisUzCm: number;
}

/** Erkek Boxer — Beden Bazlı Kalıp Boyutları (Excel: Kumaş Tüketimi sayfası) */
export const MALE_BOXER_SIZES: Record<SizeKey, MaleBoxerSize> = {
  S:   { kalipBoyCm: 30, yarimGenCm: 25, belCevresiCm: 77,    pacaCevresiCm: 44, dikisUzCm: 180 },
  M:   { kalipBoyCm: 32, yarimGenCm: 28, belCevresiCm: 83.5,  pacaCevresiCm: 48, dikisUzCm: 200 },
  L:   { kalipBoyCm: 34, yarimGenCm: 31, belCevresiCm: 91,    pacaCevresiCm: 52, dikisUzCm: 220 },
  XL:  { kalipBoyCm: 36, yarimGenCm: 34, belCevresiCm: 99.5,  pacaCevresiCm: 56, dikisUzCm: 240 },
  XXL: { kalipBoyCm: 38, yarimGenCm: 37, belCevresiCm: 108,   pacaCevresiCm: 60, dikisUzCm: 260 },
};

/** Kadın Külot — Beden Bazlı Kalıp Boyutları (Excel: Kumaş Tüketimi sayfası) */
export const FEMALE_PANTY_SIZES: Record<SizeKey, FemalePantySize> = {
  S:   { kalipBoyCm: 22, yarimGenCm: 22, belCevresiCm: 66, bacakAciklikCm: 52, icKatmanAlani: 0.0035, dikisUzCm: 140 },
  M:   { kalipBoyCm: 23, yarimGenCm: 24, belCevresiCm: 70, bacakAciklikCm: 55, icKatmanAlani: 0.0040, dikisUzCm: 155 },
  L:   { kalipBoyCm: 24, yarimGenCm: 26, belCevresiCm: 76, bacakAciklikCm: 58, icKatmanAlani: 0.0046, dikisUzCm: 170 },
  XL:  { kalipBoyCm: 25, yarimGenCm: 28, belCevresiCm: 82, bacakAciklikCm: 62, icKatmanAlani: 0.0052, dikisUzCm: 185 },
  XXL: { kalipBoyCm: 26, yarimGenCm: 30, belCevresiCm: 88, bacakAciklikCm: 66, icKatmanAlani: 0.0058, dikisUzCm: 200 },
};

// ─── SKU MAPPİNG ──────────────────────────────────────────

export type ProductType = "MALE_BOXER" | "FEMALE_PANTY";

/** SKU → ürün tipi eşlemesi */
export const SKU_PRODUCT_TYPE: Record<string, ProductType> = {
  "EB-S": "MALE_BOXER",
  "EB-L": "MALE_BOXER",
  "EB-G": "MALE_BOXER",
  "KK-S": "FEMALE_PANTY",
  "KK-B": "FEMALE_PANTY",
  "KK-T": "FEMALE_PANTY",
};

// ─── HESAPLAMA FONKSİYONLARI ───────────────────────────────

/** Tek ürün-beden için kumaş hesabı */
function calculateFabric(
  kalipBoyCm: number,
  yarimGenCm: number,
  quantity: number,
): { netAlanM2: number; fireDahilM2: number; agirlikGr: number } {
  // netAlan = kalıpBoyu × yarımGenişlik × 2 / 10000 (m²)
  const netAlanM2 = (kalipBoyCm * yarimGenCm * 2) / 10000;
  // fireDahil = netAlan × 1.10
  const fireDahilM2 = netAlanM2 * (1 + PRODUCTION_CONSTANTS.WASTE_RATE);
  // ağırlık = fireDahilAlan × GSM (gram)
  const agirlikGr = fireDahilM2 * PRODUCTION_CONSTANTS.GSM;

  return {
    netAlanM2: netAlanM2 * quantity,
    fireDahilM2: fireDahilM2 * quantity,
    agirlikGr: agirlikGr * quantity,
  };
}

/** Erkek boxer lastik hesabı (bel + 2×paça) */
function calculateMaleElastic(
  belCevresiCm: number,
  pacaCevresiCm: number,
  quantity: number,
): { belM: number; belGr: number; pacaM: number; pacaGr: number; toplamGr: number } {
  const { ELASTIC } = PRODUCTION_CONSTANTS;

  // Bel lastiği: (belÇevresi + 3cm ekleme payı) / 100 = metre
  const belM = (belCevresiCm + ELASTIC.SEAM_ALLOWANCE_CM) / 100;
  const belGr = belM * ELASTIC.MALE_WAIST_WEIGHT_PER_M;

  // Paça lastiği: ((paçaÇevresi + 3cm) × 2 paça) / 100 = metre
  const pacaM = ((pacaCevresiCm + ELASTIC.SEAM_ALLOWANCE_CM) * 2) / 100;
  const pacaGr = pacaM * ELASTIC.MALE_LEG_WEIGHT_PER_M;

  return {
    belM: belM * quantity,
    belGr: belGr * quantity,
    pacaM: pacaM * quantity,
    pacaGr: pacaGr * quantity,
    toplamGr: (belGr + pacaGr) * quantity,
  };
}

/** Kadın külot lastik hesabı (bel + 2×bacak) */
function calculateFemaleElastic(
  belCevresiCm: number,
  bacakAciklikCm: number,
  quantity: number,
): { belM: number; belGr: number; bacakM: number; bacakGr: number; toplamGr: number } {
  const { ELASTIC } = PRODUCTION_CONSTANTS;

  // Bel lastiği: (belÇevresi + 3cm) / 100
  const belM = (belCevresiCm + ELASTIC.SEAM_ALLOWANCE_CM) / 100;
  const belGr = belM * ELASTIC.FEMALE_WAIST_WEIGHT_PER_M;

  // Bacak lastiği: ((bacakAçıklık + 3cm) × 2) / 100
  const bacakM = ((bacakAciklikCm + ELASTIC.SEAM_ALLOWANCE_CM) * 2) / 100;
  const bacakGr = bacakM * ELASTIC.FEMALE_LEG_WEIGHT_PER_M;

  return {
    belM: belM * quantity,
    belGr: belGr * quantity,
    bacakM: bacakM * quantity,
    bacakGr: bacakGr * quantity,
    toplamGr: (belGr + bacakGr) * quantity,
  };
}

/** İplik hesabı */
function calculateThread(
  dikisUzCm: number,
  productType: ProductType,
  quantity: number,
): { toplamM: number; agirlikGr: number } {
  // Overlok = dikişUzunluğu × 4 (cm)
  const overlokCm = dikisUzCm * 4;
  // Düz dikiş: erkek = 50×2.5 = 125cm, kadın = 40×2.5 = 100cm
  const duzDikisCm = productType === "MALE_BOXER"
    ? PRODUCTION_CONSTANTS.MALE_FLAT_STITCH_CM
    : PRODUCTION_CONSTANTS.FEMALE_FLAT_STITCH_CM;

  // Toplam = (overlok + düzDikiş) / 100 (metre)
  const toplamM = (overlokCm + duzDikisCm) / 100;
  // Ağırlık = toplamMetre × 0.3 gr/m
  const agirlikGr = toplamM * PRODUCTION_CONSTANTS.THREAD_WEIGHT_PER_M;

  return {
    toplamM: toplamM * quantity,
    agirlikGr: agirlikGr * quantity,
  };
}

// ─── ANA BOM HESAPLAMA ─────────────────────────────────────

/** Sipariş kalemi girdi tipi */
export interface BOMInput {
  sku: string;             // "EB-S", "KK-T" vb.
  productName: string;     // "Erkek Boxer Siyah"
  color: string;
  sizeS: number;
  sizeM: number;
  sizeL: number;
  sizeXL: number;
  sizeXXL: number;
}

/** Tek malzeme kalemi */
export interface BOMMaterialItem {
  name: string;            // "Ana Kumaş (Siyah Penye+Elastan)"
  type: string;            // "FABRIC", "ELASTIC", "THREAD", "LABEL", "PACKAGING"
  quantity: number;        // Miktar
  unit: string;            // "kg", "m", "adet"
  perPieceGr: number;      // Adet başına gram
  totalWeightGr: number;   // Toplam gram
}

/** BOM sonucu */
export interface BOMResult {
  materials: BOMMaterialItem[];
  summary: {
    totalFabricKg: number;
    totalLiningKg: number;
    totalElasticM: number;
    totalThreadM: number;
    totalLabels: number;
    totalPackaging: number;
    totalPieces: number;
    totalWeightKg: number;
  };
  /** Ürün bazlı detay (her SKU×beden için) */
  breakdown: BOMBreakdownItem[];
}

export interface BOMBreakdownItem {
  sku: string;
  productName: string;
  color: string;
  size: SizeKey;
  quantity: number;
  fabricGr: number;
  liningGr: number;
  elasticGr: number;
  threadGr: number;
  labelGr: number;
  packagingGr: number;
  totalGr: number;
}

/**
 * Ana BOM hesaplama fonksiyonu
 * Sipariş items[] alır → her beden/ürün için malzeme hesaplar → toplam BOM döner
 */
export function calculateBOM(items: BOMInput[]): BOMResult {
  const materials: BOMMaterialItem[] = [];
  const breakdown: BOMBreakdownItem[] = [];

  // Toplam akümülatörler
  let totalFabricGr = 0;
  let totalLiningGr = 0;
  let totalElasticGr = 0;
  let totalElasticM = 0;
  let totalThreadGr = 0;
  let totalThreadM = 0;
  let totalLabels = 0;
  let totalPackaging = 0;
  let totalPieces = 0;

  // Malzeme gruplama (renk/tip bazlı birleştirme için)
  const fabricByColor: Record<string, { gr: number; m2: number }> = {};
  const liningTotal = { gr: 0, m2: 0 };
  const elasticByType: Record<string, { gr: number; m: number }> = {};
  const threadTotal = { gr: 0, m: 0 };

  for (const item of items) {
    // SKU eşleştirme: önce direkt, sonra kısa kod çıkart (VRT-EB-GRI → EB-G)
    let productType = SKU_PRODUCT_TYPE[item.sku];
    if (!productType) {
      // SKU'dan kısa kodu çıkart: VRT-EB-GRI → EB-GRI → EB-G (ilk 4 karakter)
      const parts = item.sku.replace(/^VRT-/, "").split("-");
      if (parts.length >= 2) {
        const shortSku = `${parts[0]}-${parts[1].charAt(0)}`;
        productType = SKU_PRODUCT_TYPE[shortSku];
      }
    }
    if (!productType) {
      // Ürün adından tahmin et
      const name = (item.productName || "").toLowerCase();
      if (name.includes("boxer") || name.includes("erkek")) productType = "MALE_BOXER";
      else if (name.includes("külot") || name.includes("kadın") || name.includes("panty")) productType = "FEMALE_PANTY";
    }
    if (!productType) {
      console.warn(`Bilinmeyen SKU: ${item.sku}, atlanıyor.`);
      continue;
    }

    const isMale = productType === "MALE_BOXER";
    const sizes: [SizeKey, number][] = [
      ["S", item.sizeS],
      ["M", item.sizeM],
      ["L", item.sizeL],
      ["XL", item.sizeXL],
      ["XXL", item.sizeXXL],
    ];

    for (const [size, qty] of sizes) {
      if (qty <= 0) continue;

      totalPieces += qty;

      if (isMale) {
        const sizeData = MALE_BOXER_SIZES[size];

        // Kumaş
        const fabric = calculateFabric(sizeData.kalipBoyCm, sizeData.yarimGenCm, qty);
        totalFabricGr += fabric.agirlikGr;
        fabricByColor[item.color] = fabricByColor[item.color] || { gr: 0, m2: 0 };
        fabricByColor[item.color].gr += fabric.agirlikGr;
        fabricByColor[item.color].m2 += fabric.fireDahilM2;

        // Lastik
        const elastic = calculateMaleElastic(sizeData.belCevresiCm, sizeData.pacaCevresiCm, qty);
        totalElasticGr += elastic.toplamGr;
        totalElasticM += elastic.belM + elastic.pacaM;
        elasticByType["Bel Lastiği 4cm (Erkek)"] = elasticByType["Bel Lastiği 4cm (Erkek)"] || { gr: 0, m: 0 };
        elasticByType["Bel Lastiği 4cm (Erkek)"].gr += elastic.belGr;
        elasticByType["Bel Lastiği 4cm (Erkek)"].m += elastic.belM;
        elasticByType["Paça Lastiği 1cm (Erkek)"] = elasticByType["Paça Lastiği 1cm (Erkek)"] || { gr: 0, m: 0 };
        elasticByType["Paça Lastiği 1cm (Erkek)"].gr += elastic.pacaGr;
        elasticByType["Paça Lastiği 1cm (Erkek)"].m += elastic.pacaM;

        // İplik
        const thread = calculateThread(sizeData.dikisUzCm, "MALE_BOXER", qty);
        totalThreadGr += thread.agirlikGr;
        totalThreadM += thread.toplamM;
        threadTotal.gr += thread.agirlikGr;
        threadTotal.m += thread.toplamM;

        // Aksesuar
        const labelGr = PRODUCTION_CONSTANTS.LABEL_WEIGHT * qty;
        const packGr = PRODUCTION_CONSTANTS.PACKAGING_WEIGHT_MALE * qty;
        totalLabels += qty;
        totalPackaging += qty;

        // Breakdown
        breakdown.push({
          sku: item.sku,
          productName: item.productName,
          color: item.color,
          size,
          quantity: qty,
          fabricGr: fabric.agirlikGr,
          liningGr: 0,
          elasticGr: elastic.toplamGr,
          threadGr: thread.agirlikGr,
          labelGr,
          packagingGr: packGr,
          totalGr: fabric.agirlikGr + elastic.toplamGr + thread.agirlikGr + labelGr + packGr,
        });
      } else {
        // FEMALE_PANTY
        const sizeData = FEMALE_PANTY_SIZES[size];

        // Ana kumaş
        const fabric = calculateFabric(sizeData.kalipBoyCm, sizeData.yarimGenCm, qty);
        totalFabricGr += fabric.agirlikGr;
        fabricByColor[item.color] = fabricByColor[item.color] || { gr: 0, m2: 0 };
        fabricByColor[item.color].gr += fabric.agirlikGr;
        fabricByColor[item.color].m2 += fabric.fireDahilM2;

        // İç katman (kadına özel)
        const liningGr = sizeData.icKatmanAlani * PRODUCTION_CONSTANTS.INNER_LINING_GSM * qty;
        totalLiningGr += liningGr;
        liningTotal.gr += liningGr;
        liningTotal.m2 += sizeData.icKatmanAlani * qty;

        // Lastik
        const elastic = calculateFemaleElastic(sizeData.belCevresiCm, sizeData.bacakAciklikCm, qty);
        totalElasticGr += elastic.toplamGr;
        totalElasticM += elastic.belM + elastic.bacakM;
        elasticByType["Bel Lastiği 1.5cm (Kadın)"] = elasticByType["Bel Lastiği 1.5cm (Kadın)"] || { gr: 0, m: 0 };
        elasticByType["Bel Lastiği 1.5cm (Kadın)"].gr += elastic.belGr;
        elasticByType["Bel Lastiği 1.5cm (Kadın)"].m += elastic.belM;
        elasticByType["Bacak Lastiği 0.8cm (Kadın)"] = elasticByType["Bacak Lastiği 0.8cm (Kadın)"] || { gr: 0, m: 0 };
        elasticByType["Bacak Lastiği 0.8cm (Kadın)"].gr += elastic.bacakGr;
        elasticByType["Bacak Lastiği 0.8cm (Kadın)"].m += elastic.bacakM;

        // İplik
        const thread = calculateThread(sizeData.dikisUzCm, "FEMALE_PANTY", qty);
        totalThreadGr += thread.agirlikGr;
        totalThreadM += thread.toplamM;
        threadTotal.gr += thread.agirlikGr;
        threadTotal.m += thread.toplamM;

        // Aksesuar
        const labelGr = PRODUCTION_CONSTANTS.LABEL_WEIGHT * qty;
        const packGr = PRODUCTION_CONSTANTS.PACKAGING_WEIGHT_FEMALE * qty;
        totalLabels += qty;
        totalPackaging += qty;

        // Breakdown
        breakdown.push({
          sku: item.sku,
          productName: item.productName,
          color: item.color,
          size,
          quantity: qty,
          fabricGr: fabric.agirlikGr,
          liningGr,
          elasticGr: elastic.toplamGr,
          threadGr: thread.agirlikGr,
          labelGr,
          packagingGr: packGr,
          totalGr: fabric.agirlikGr + liningGr + elastic.toplamGr + thread.agirlikGr + labelGr + packGr,
        });
      }
    }
  }

  // ─── Malzeme listesi oluştur ───

  // Kumaşlar (renk bazlı)
  for (const [color, data] of Object.entries(fabricByColor)) {
    materials.push({
      name: `Ana Kumaş — ${color} (%95 Penye + %5 Elastan)`,
      type: "FABRIC",
      quantity: round(data.gr / 1000, 3), // kg
      unit: "kg",
      perPieceGr: totalPieces > 0 ? round(data.gr / totalPieces, 2) : 0,
      totalWeightGr: round(data.gr, 2),
    });
  }

  // İç katman (kadın)
  if (liningTotal.gr > 0) {
    materials.push({
      name: "İç Katman Pamuk (%100 Pamuk, 140 GSM)",
      type: "FABRIC",
      quantity: round(liningTotal.gr / 1000, 3),
      unit: "kg",
      perPieceGr: totalPieces > 0 ? round(liningTotal.gr / totalPieces, 2) : 0,
      totalWeightGr: round(liningTotal.gr, 2),
    });
  }

  // Lastikler (tip bazlı)
  for (const [typeName, data] of Object.entries(elasticByType)) {
    materials.push({
      name: typeName,
      type: "ELASTIC",
      quantity: round(data.m, 2), // metre
      unit: "m",
      perPieceGr: totalPieces > 0 ? round(data.gr / totalPieces, 2) : 0,
      totalWeightGr: round(data.gr, 2),
    });
  }

  // İplik
  if (threadTotal.m > 0) {
    materials.push({
      name: "Dikiş İpliği (Overlok + Düz)",
      type: "THREAD",
      quantity: round(threadTotal.m, 2),
      unit: "m",
      perPieceGr: totalPieces > 0 ? round(threadTotal.gr / totalPieces, 2) : 0,
      totalWeightGr: round(threadTotal.gr, 2),
    });
  }

  // Etiket
  if (totalLabels > 0) {
    materials.push({
      name: "Yıkama Talimatı Etiketi",
      type: "LABEL",
      quantity: totalLabels,
      unit: "adet",
      perPieceGr: PRODUCTION_CONSTANTS.LABEL_WEIGHT,
      totalWeightGr: totalLabels * PRODUCTION_CONSTANTS.LABEL_WEIGHT,
    });
  }

  // Ambalaj (poşet + karton insert)
  if (totalPackaging > 0) {
    materials.push({
      name: "Ambalaj Seti (Poşet + Karton Insert)",
      type: "PACKAGING",
      quantity: totalPackaging,
      unit: "adet",
      perPieceGr: totalPieces > 0 ? round((totalFabricGr > 0 ? PRODUCTION_CONSTANTS.PACKAGING_WEIGHT_MALE : PRODUCTION_CONSTANTS.PACKAGING_WEIGHT_FEMALE), 1) : 0,
      totalWeightGr: round(
        breakdown.reduce((s, b) => s + b.packagingGr, 0),
        2,
      ),
    });
  }

  const totalWeightGr = totalFabricGr + totalLiningGr + totalElasticGr + totalThreadGr
    + (totalLabels * PRODUCTION_CONSTANTS.LABEL_WEIGHT)
    + breakdown.reduce((s, b) => s + b.packagingGr, 0);

  return {
    materials,
    summary: {
      totalFabricKg: round(totalFabricGr / 1000, 3),
      totalLiningKg: round(totalLiningGr / 1000, 3),
      totalElasticM: round(totalElasticM, 2),
      totalThreadM: round(totalThreadM, 2),
      totalLabels,
      totalPackaging,
      totalPieces,
      totalWeightKg: round(totalWeightGr / 1000, 3),
    },
    breakdown,
  };
}

// ─── YARDIMCI ──────────────────────────────────────────────

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

/**
 * M beden 1 adet için hızlı BOM hesabı (doğrulama amaçlı)
 * Excel "BOM - M Beden" sayfasıyla karşılaştırma için
 */
export function calculateSinglePieceBOM(sku: string): {
  fabricGr: number;
  liningGr: number;
  elasticGr: number;
  threadGr: number;
  labelGr: number;
  packagingGr: number;
  totalGr: number;
} {
  const productType = SKU_PRODUCT_TYPE[sku];
  if (!productType) throw new Error(`Bilinmeyen SKU: ${sku}`);

  const isMale = productType === "MALE_BOXER";
  const size: SizeKey = "M";

  if (isMale) {
    const s = MALE_BOXER_SIZES[size];
    const fabric = calculateFabric(s.kalipBoyCm, s.yarimGenCm, 1);
    const elastic = calculateMaleElastic(s.belCevresiCm, s.pacaCevresiCm, 1);
    const thread = calculateThread(s.dikisUzCm, "MALE_BOXER", 1);
    return {
      fabricGr: round(fabric.agirlikGr, 4),
      liningGr: 0,
      elasticGr: round(elastic.toplamGr, 4),
      threadGr: round(thread.agirlikGr, 4),
      labelGr: PRODUCTION_CONSTANTS.LABEL_WEIGHT,
      packagingGr: PRODUCTION_CONSTANTS.PACKAGING_WEIGHT_MALE,
      totalGr: round(fabric.agirlikGr + elastic.toplamGr + thread.agirlikGr + PRODUCTION_CONSTANTS.LABEL_WEIGHT + PRODUCTION_CONSTANTS.PACKAGING_WEIGHT_MALE, 4),
    };
  } else {
    const s = FEMALE_PANTY_SIZES[size];
    const fabric = calculateFabric(s.kalipBoyCm, s.yarimGenCm, 1);
    const lining = s.icKatmanAlani * PRODUCTION_CONSTANTS.INNER_LINING_GSM;
    const elastic = calculateFemaleElastic(s.belCevresiCm, s.bacakAciklikCm, 1);
    const thread = calculateThread(s.dikisUzCm, "FEMALE_PANTY", 1);
    return {
      fabricGr: round(fabric.agirlikGr, 4),
      liningGr: round(lining, 4),
      elasticGr: round(elastic.toplamGr, 4),
      threadGr: round(thread.agirlikGr, 4),
      labelGr: PRODUCTION_CONSTANTS.LABEL_WEIGHT,
      packagingGr: PRODUCTION_CONSTANTS.PACKAGING_WEIGHT_FEMALE,
      totalGr: round(fabric.agirlikGr + lining + elastic.toplamGr + thread.agirlikGr + PRODUCTION_CONSTANTS.LABEL_WEIGHT + PRODUCTION_CONSTANTS.PACKAGING_WEIGHT_FEMALE, 4),
    };
  }
}
