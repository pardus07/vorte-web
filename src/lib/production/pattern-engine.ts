/**
 * Vorte Tekstil — Parametrik Kalip Hesaplama Motoru
 *
 * FreeSewing Bruce boxer-brief referansi ile gercekci kalip geometrisi.
 * Her parca SVG path olarak cubic/quadratic bezier egrileri ile cizilir.
 * Beden verileri bom-calculator.ts'den alinir.
 */

import {
  MALE_BOXER_SIZES,
  FEMALE_PANTY_SIZES,
  type ProductType,
} from "./bom-calculator";

// ─── TYPES ──────────────────────────────────────────────────

export type SizeKey = "S" | "M" | "L" | "XL" | "XXL";

export type ModelType =
  | "boxer_brief"
  | "trunk"
  | "bikini"
  | "hipster";

export type SeamType = "flatlock" | "overlock" | "coverlock" | "waistband";

export interface Point {
  x: number;
  y: number;
}

export interface PatternPiece {
  name: string;
  label: string;
  svgPath: string;        // SVG path d attribute — bezier egrili
  points: Point[];         // Geriye uyumluluk icin kose noktalari
  grainLine: { start: Point; end: Point };
  notches: Point[];
  color: string;
  width: number;           // cm
  height: number;          // cm
  areaCm2: number;
  grainAngle: number;      // derece (0 = dikey)
  seamType: string;        // "flatlock", "overlock", "coverlock"
  offsetX: number;         // SVG'deki x pozisyonu (cm)
  offsetY: number;         // SVG'deki y pozisyonu (cm)
}

export interface Pattern {
  modelType: ModelType;
  size: SizeKey;
  gender: "male" | "female";
  pieces: PatternPiece[];
  totalAreaCm2: number;
  totalAreaWithSeamCm2: number;
  realFabricArea: number;  // dikiş payı + fire dahil cm²
  fabricAreaM2: number;
  measurements: Record<string, number>;
  metadata: {
    waistCirc: number;
    hipCirc: number;
    patternHeight: number;
    seamType: Record<string, SeamType>;
  };
}

export interface PatternOptions {
  seamAllowance?: SeamType;
  includeShrinkage?: boolean;
  easeOverride?: Partial<EaseProfile>;
  scale?: number;          // 1cm = kaç px (varsayilan 4)
}

export interface EaseProfile {
  waist: number;
  hip: number;
  leg: number;
  gusset: number;
}

export interface ValidationResult {
  valid: boolean;
  isValid: boolean;        // alias
  checks: { name: string; passed: boolean; message: string; value?: number }[];
  errors: string[];
  warnings: string[];
}

// ─── SABİTLER ───────────────────────────────────────────────

/** Bolgesel ease (bolluk) profilleri */
export const EASE_PROFILES: Record<string, EaseProfile> = {
  MALE_BOXER:   { waist: 0.12, hip: 0.07, leg: 0.09, gusset: 0.01 },
  FEMALE_PANTY: { waist: 0.11, hip: 0.09, leg: 0.06, gusset: 0 },
};

/** Cekme paylari (yikama sonrasi) */
export const SHRINKAGE = {
  lengthwise: 0.05,  // %5 boyuna cekme
  crosswise: 0.03,   // %3 enine cekme
} as const;

/** Dikis paylari (cm) */
export const SEAM_ALLOWANCES: Record<SeamType, number> = {
  flatlock:  0.35,
  overlock:  0.6,
  coverlock: 1.2,
  waistband: 3.0,
};

/** SVG renk paleti */
const PIECE_COLORS: Record<string, string> = {
  front_panel:   "#3B82F6",
  back_panel:    "#22C55E",
  side_panel:    "#A855F7",
  gusset:        "#F97316",
  gusset_lining: "#F97316",
  waistband:     "#8B5CF6",
};

/** Hip ratio — kalca bolme oranlari (FreeSewing Bruce referansi) */
const HIP_RATIOS = {
  front: 0.30,
  back:  0.32,
  side:  0.19,
} as const;

/** Grading tablosu — beden arasi artislar (cm) */
const GRADING_TABLE = {
  waist: { "S-M": 4, "M-L": 4, "L-XL": 5, "XL-XXL": 5 },
  hip:   { "S-M": 4, "M-L": 4, "L-XL": 5, "XL-XXL": 5 },
  leg:   { "S-M": 1.5, "M-L": 2, "L-XL": 2, "XL-XXL": 2.5 },
  gussetWidth: { "S-M": 0, "M-L": 0, "L-XL": 0, "XL-XXL": 0 },
} as const;

const SIZE_ORDER: SizeKey[] = ["S", "M", "L", "XL", "XXL"];

// ─── YARDIMCI FONKSİYONLAR ─────────────────────────────────

function getSizeIndex(size: SizeKey): number {
  return SIZE_ORDER.indexOf(size);
}

/** Shoelace formuluyle poligon alani (cm²) */
function polygonAreaFromPath(svgPath: string, scale: number): number {
  // Path'deki tum koordinatlari parse et ve shoelace uygula
  const coords: [number, number][] = [];
  const nums = svgPath.match(/-?\d+\.?\d*/g);
  if (!nums) return 0;
  for (let i = 0; i < nums.length; i += 2) {
    if (i + 1 < nums.length) {
      coords.push([parseFloat(nums[i]) / scale, parseFloat(nums[i + 1]) / scale]);
    }
  }
  if (coords.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  return Math.abs(area / 2);
}

/** Basit dikdortgen alan tahmini (bezier parcalar icin fallback) */
function estimateArea(width: number, height: number, shapeFactor: number): number {
  return width * height * shapeFactor;
}

/** Sayi yuvarla (1 ondalik) */
function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Sayi yuvarla (2 ondalik) */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── ERKEK BOXER BRİEF — 4 PARCA ───────────────────────────

function generateMaleBoxerPieces(
  size: SizeKey,
  options: PatternOptions = {},
): { pieces: PatternPiece[]; measurements: Record<string, number> } {
  const sd = MALE_BOXER_SIZES[size];
  const ease = { ...EASE_PROFILES.MALE_BOXER, ...options.easeOverride };

  // Temel olculer
  const hipCirc = sd.yarimGenCm * 4;
  const waistCirc = sd.belCevresiCm;
  const patternH = sd.kalipBoyCm;

  // Ease + cekme paylari
  const shrinkX = options.includeShrinkage ? (1 + SHRINKAGE.crosswise) : 1;
  const shrinkY = options.includeShrinkage ? (1 + SHRINKAGE.lengthwise) : 1;

  // Gusset sabitleri
  const gussetW = 7;    // cm
  const gussetH = 3.5;  // cm

  // ──────── PACA (BACAK ACIKLIGI) HESABI ────────
  // pacaCevresiCm = bir bacak acikliginin cevresi (M: 48cm)
  // Sort seklinde kalip icin paca genislikleri her panele dagitilir
  const pacaCirc = sd.pacaCevresiCm;
  const normTotal = HIP_RATIOS.front + HIP_RATIOS.back + HIP_RATIOS.side; // 0.81
  const legOpeningFlat = pacaCirc / 2; // Yarim cevre = duz olcu (M: 24cm)
  const legDistributable = legOpeningFlat - gussetH; // Gusset'in bacak payini cikart

  // Panel basina bacak payi (bir bacak icin, duz olcu)
  const frontLegFlat = legDistributable * (HIP_RATIOS.front / normTotal) * (1 + ease.leg) * shrinkX;
  const backLegFlat = legDistributable * (HIP_RATIOS.back / normTotal) * (1 + ease.leg) * shrinkX;
  const sideLegFlat = legDistributable * (HIP_RATIOS.side / normTotal) * (1 + ease.leg) * shrinkX;

  // ──────── ON PANEL ────────
  // Sort sekli — belden kalcaya genisler, kasik centigi ile iki bacak acikligi olusturur
  // FreeSewing Bruce referansi: hipFront = hips * 0.30
  const hipFront = hipCirc * HIP_RATIOS.front; // toplam on kalca (M: 33.6cm)
  const fpHalfW = (hipFront / 2) * (1 + ease.hip) * shrinkX; // yarim genislik (M: ~18.0cm)
  const fpHeight = patternH * shrinkY;
  const fpCrotchHalfW = gussetW * 0.5; // kasik koprusu yarim genisligi (3.5cm)

  // Bacak alt genisligi — sort seklinin temeli
  const fpBottomHalfW = frontLegFlat + fpCrotchHalfW; // M: ~11.8cm (mevcut: 3.5cm!)
  // Kasik centigi derinligi (paca kenarindan yukari)
  const fpCrotchDepth = fpHeight * 0.15; // ~4.8cm — on kasik sigi
  const fpCrotchY = fpHeight - fpCrotchDepth; // Kasik tepe noktasi Y

  // Bel — kalcadan biraz dar
  const fpWaistHalfW = fpHalfW * 0.92;
  // Bel egrisi icbukey derinligi
  const fpWaistDip = 1.5;
  // Kalca hatti yuksekligi (belden asagi ~%35)
  const fpHipY = fpHeight * 0.35;

  // Merkez x = yarim genislik (parca simetrik)
  const cx = fpHalfW;
  const fpW = fpHalfW * 2;

  const fpPath = [
    `M ${r2(cx - fpWaistHalfW)} 0`,
    // Bel egrisi — quadratic bezier, ortada asagi (icbukey)
    `Q ${r2(cx)} ${r2(fpWaistDip)}, ${r2(cx + fpWaistHalfW)} 0`,
    // Sag yan: belden kalcaya hafif disari acilan
    `L ${r2(cx + fpHalfW)} ${r2(fpHipY)}`,
    // Sag yan: kalcadan paca kenarindaki bacak genisligine — hafif daralan cubic bezier
    `C ${r2(cx + fpHalfW)} ${r2(fpHipY + (fpHeight - fpHipY) * 0.55)}, ${r2(cx + fpBottomHalfW + 1)} ${r2(fpHeight * 0.88)}, ${r2(cx + fpBottomHalfW)} ${r2(fpHeight)}`,
    // Sag paca alt kenari — bacak acikligi (duz, disaridan kasik koprusune)
    `L ${r2(cx + fpCrotchHalfW)} ${r2(fpHeight)}`,
    // Kasik centigi — quadratic bezier, ortada yukari cikar
    `Q ${r2(cx + fpCrotchHalfW * 0.5)} ${r2(fpCrotchY)}, ${r2(cx)} ${r2(fpCrotchY)}`,
    `Q ${r2(cx - fpCrotchHalfW * 0.5)} ${r2(fpCrotchY)}, ${r2(cx - fpCrotchHalfW)} ${r2(fpHeight)}`,
    // Sol paca alt kenari
    `L ${r2(cx - fpBottomHalfW)} ${r2(fpHeight)}`,
    // Sol yan: pacadan kalcaya — cubic bezier (simetrik)
    `C ${r2(cx - fpBottomHalfW - 1)} ${r2(fpHeight * 0.88)}, ${r2(cx - fpHalfW)} ${r2(fpHipY + (fpHeight - fpHipY) * 0.55)}, ${r2(cx - fpHalfW)} ${r2(fpHipY)}`,
    // Sol yan: kalcadan bele
    `L ${r2(cx - fpWaistHalfW)} 0`,
    `Z`,
  ].join(" ");

  const frontPiece: PatternPiece = {
    name: "front_panel",
    label: "On Panel",
    svgPath: fpPath,
    points: [
      { x: cx - fpWaistHalfW, y: 0 },
      { x: cx + fpWaistHalfW, y: 0 },
      { x: cx + fpHalfW, y: fpHipY },
      { x: cx + fpBottomHalfW, y: fpHeight },
      { x: cx + fpCrotchHalfW, y: fpHeight },
      { x: cx, y: fpCrotchY },
      { x: cx - fpCrotchHalfW, y: fpHeight },
      { x: cx - fpBottomHalfW, y: fpHeight },
      { x: cx - fpHalfW, y: fpHipY },
    ],
    grainLine: { start: { x: cx, y: 2 }, end: { x: cx, y: fpCrotchY - 2 } },
    notches: [
      { x: cx + fpHalfW, y: fpHipY },
      { x: cx - fpHalfW, y: fpHipY },
      { x: cx, y: fpCrotchY },
    ],
    color: PIECE_COLORS.front_panel,
    width: r1(fpW),
    height: r1(fpHeight),
    areaCm2: r1(estimateArea(fpW, fpHeight, 0.80)),
    grainAngle: 0,
    seamType: "flatlock",
    offsetX: 0,
    offsetY: 0,
  };

  // ──────── ARKA PANEL ────────
  // Sort sekli — onden daha genis, kasik centigi daha derin
  const hipBack = hipCirc * HIP_RATIOS.back; // toplam arka kalca (M: 35.8cm)
  const bpHalfW = (hipBack / 2) * (1 + ease.hip) * shrinkX; // yarim genislik (M: ~19.2cm)
  const backRise = 3.5; // cm ek yukseklik
  const bpHeight = (patternH + backRise) * shrinkY;
  const bpCrotchHalfW = gussetW * 0.55; // kasik koprusu (3.85cm)

  // Arka bacak alt genisligi
  const bpBottomHalfW = backLegFlat + bpCrotchHalfW; // M: ~12.7cm
  // Arka kasik centigi daha derin (oturma konforu)
  const bpCrotchDepth = bpHeight * 0.20; // ~7.1cm
  const bpCrotchY = bpHeight - bpCrotchDepth;

  // Bel — arka bel kalcadan dar (oturma konforu)
  const bpWaistHalfW = bpHalfW * 0.88;
  const bpWaistDip = 2.5; // Daha belirgin icbukey
  const bpHipY = bpHeight * 0.30;
  const bpCx = bpHalfW;
  const bpW = bpHalfW * 2;

  const bpPath = [
    `M ${r2(bpCx - bpWaistHalfW)} 0`,
    // Bel egrisi — daha belirgin icbukey
    `Q ${r2(bpCx)} ${r2(bpWaistDip)}, ${r2(bpCx + bpWaistHalfW)} 0`,
    // Sag yan — kalcaya dogru genisleme
    `L ${r2(bpCx + bpHalfW)} ${r2(bpHipY)}`,
    // Sag yan: kalcadan paca kenarindaki bacak genisligine — daha belirgin daralan
    `C ${r2(bpCx + bpHalfW)} ${r2(bpHipY + (bpHeight - bpHipY) * 0.50)}, ${r2(bpCx + bpBottomHalfW + 1.5)} ${r2(bpHeight * 0.85)}, ${r2(bpCx + bpBottomHalfW)} ${r2(bpHeight)}`,
    // Sag paca alt kenari
    `L ${r2(bpCx + bpCrotchHalfW)} ${r2(bpHeight)}`,
    // Arka kasik centigi — daha derin (yukari cikar)
    `Q ${r2(bpCx + bpCrotchHalfW * 0.4)} ${r2(bpCrotchY)}, ${r2(bpCx)} ${r2(bpCrotchY)}`,
    `Q ${r2(bpCx - bpCrotchHalfW * 0.4)} ${r2(bpCrotchY)}, ${r2(bpCx - bpCrotchHalfW)} ${r2(bpHeight)}`,
    // Sol paca alt kenari
    `L ${r2(bpCx - bpBottomHalfW)} ${r2(bpHeight)}`,
    // Sol yan: pacadan kalcaya (simetrik)
    `C ${r2(bpCx - bpBottomHalfW - 1.5)} ${r2(bpHeight * 0.85)}, ${r2(bpCx - bpHalfW)} ${r2(bpHipY + (bpHeight - bpHipY) * 0.50)}, ${r2(bpCx - bpHalfW)} ${r2(bpHipY)}`,
    // Sol yan
    `L ${r2(bpCx - bpWaistHalfW)} 0`,
    `Z`,
  ].join(" ");

  const backPiece: PatternPiece = {
    name: "back_panel",
    label: "Arka Panel",
    svgPath: bpPath,
    points: [
      { x: bpCx - bpWaistHalfW, y: 0 },
      { x: bpCx + bpWaistHalfW, y: 0 },
      { x: bpCx + bpHalfW, y: bpHipY },
      { x: bpCx + bpBottomHalfW, y: bpHeight },
      { x: bpCx + bpCrotchHalfW, y: bpHeight },
      { x: bpCx, y: bpCrotchY },
      { x: bpCx - bpCrotchHalfW, y: bpHeight },
      { x: bpCx - bpBottomHalfW, y: bpHeight },
      { x: bpCx - bpHalfW, y: bpHipY },
    ],
    grainLine: { start: { x: bpCx, y: 2 }, end: { x: bpCx, y: bpCrotchY - 2 } },
    notches: [
      { x: bpCx + bpHalfW, y: bpHipY },
      { x: bpCx - bpHalfW, y: bpHipY },
      { x: bpCx, y: bpCrotchY },
    ],
    color: PIECE_COLORS.back_panel,
    width: r1(bpW),
    height: r1(bpHeight),
    areaCm2: r1(estimateArea(bpW, bpHeight, 0.78)),
    grainAngle: 0,
    seamType: "flatlock",
    offsetX: 0,
    offsetY: 0,
  };

  // ──────── YAN PANEL ────────
  // Yamuk dikdortgen — ustte genis (kalca), altta dar (paca)
  const hipSide = hipCirc * HIP_RATIOS.side; // bir yan panelin kalca payi (M: 21.3cm)
  const spTopW = hipSide * (1 + ease.hip) * shrinkX; // tam yan panel genisligi (M: ~22.8cm)
  const spBotW = sideLegFlat; // Paca seviyesinde — kalcadan dar (M: ~5.3cm)
  const spHeight = patternH * shrinkY;
  const spW = Math.max(spTopW, spBotW); // En genis kenar = ust (kalca)

  // Yamuk: sol kenar iceride, sag kenar disaridda
  const spInsetTop = (spW - spTopW) / 2;
  const spInsetBot = (spW - spBotW) / 2;

  const spPath = [
    `M ${r2(spInsetTop)} 0`,
    `L ${r2(spW - spInsetTop)} 0`,
    `L ${r2(spW - spInsetBot)} ${r2(spHeight)}`,
    `L ${r2(spInsetBot)} ${r2(spHeight)}`,
    `Z`,
  ].join(" ");

  const sidePiece: PatternPiece = {
    name: "side_panel",
    label: "Yan Panel",
    svgPath: spPath,
    points: [
      { x: spInsetTop, y: 0 },
      { x: spW - spInsetTop, y: 0 },
      { x: spW - spInsetBot, y: spHeight },
      { x: spInsetBot, y: spHeight },
    ],
    grainLine: { start: { x: spW / 2, y: 2 }, end: { x: spW / 2, y: spHeight - 2 } },
    notches: [
      { x: spInsetTop, y: spHeight * 0.5 },
      { x: spW - spInsetTop, y: spHeight * 0.5 },
    ],
    color: PIECE_COLORS.side_panel,
    width: r1(spW),
    height: r1(spHeight),
    areaCm2: r1((spTopW + spBotW) / 2 * spHeight),
    grainAngle: 0,
    seamType: "flatlock",
    offsetX: 0,
    offsetY: 0,
  };

  // ──────── AG PARCASI (GUSSET) ────────
  // Kucuk dikdortgen/oval — kenarlar hafif yuvarlak
  const gRx = 1.2; // rx
  const gRy = 0.8; // ry

  // Yuvarlak kenarli dikdortgen path
  const gPath = [
    `M ${r2(gRx)} 0`,
    `L ${r2(gussetW - gRx)} 0`,
    `Q ${r2(gussetW)} 0, ${r2(gussetW)} ${r2(gRy)}`,
    `L ${r2(gussetW)} ${r2(gussetH - gRy)}`,
    `Q ${r2(gussetW)} ${r2(gussetH)}, ${r2(gussetW - gRx)} ${r2(gussetH)}`,
    `L ${r2(gRx)} ${r2(gussetH)}`,
    `Q 0 ${r2(gussetH)}, 0 ${r2(gussetH - gRy)}`,
    `L 0 ${r2(gRy)}`,
    `Q 0 0, ${r2(gRx)} 0`,
    `Z`,
  ].join(" ");

  const gussetPiece: PatternPiece = {
    name: "gusset",
    label: "Ag Parcasi",
    svgPath: gPath,
    points: [
      { x: gRx, y: 0 },
      { x: gussetW - gRx, y: 0 },
      { x: gussetW, y: gRy },
      { x: gussetW, y: gussetH - gRy },
      { x: gussetW - gRx, y: gussetH },
      { x: gRx, y: gussetH },
      { x: 0, y: gussetH - gRy },
      { x: 0, y: gRy },
    ],
    grainLine: { start: { x: gussetW / 2, y: 0.5 }, end: { x: gussetW / 2, y: gussetH - 0.5 } },
    notches: [
      { x: 0, y: gussetH / 2 },
      { x: gussetW, y: gussetH / 2 },
    ],
    color: PIECE_COLORS.gusset,
    width: gussetW,
    height: gussetH,
    areaCm2: r1(gussetW * gussetH * 0.92), // kenar yuvarlama kompanzasyonu
    grainAngle: 0,
    seamType: "overlock",
    offsetX: 0,
    offsetY: 0,
  };

  // ──────── BEL LASTİĞİ (KALIP PARCASI DEĞİL) ────────
  // 4cm genislikte logolu hazir lastik — kumastan kesilmez
  // Lastik uzunlugu: bel cevresi × %85 (elastik germe)
  const elasticWidthCm = 4; // cm — lastik genisligi
  const elasticLengthCm = r1(waistCirc * 0.85); // kesim uzunlugu (germe oncesi)

  const pieces = [frontPiece, backPiece, sidePiece, gussetPiece];

  // Yerlesimleri hesapla — yan yana, 3cm bosluk
  const gap = 3; // cm
  let curX = 0;
  for (const p of pieces) {
    p.offsetX = curX;
    p.offsetY = 0;
    curX += p.width + gap;
  }

  const measurements: Record<string, number> = {
    hipCirc,
    waistCirc,
    patternHeight: patternH,
    frontPanelWidth: r1(fpW),
    frontPanelHalfWidth: r1(fpHalfW),
    frontPanelHeight: r1(fpHeight),
    backPanelWidth: r1(bpW),
    backPanelHalfWidth: r1(bpHalfW),
    backPanelHeight: r1(bpHeight),
    sidePanelWidth: r1(spW),
    sidePanelHeight: r1(spHeight),
    gussetWidth: gussetW,
    gussetHeight: gussetH,
    elasticLengthCm,
    elasticWidthCm,
    legOpeningCirc: pacaCirc,
    frontLegHemWidth: r1(fpBottomHalfW * 2),
    backLegHemWidth: r1(bpBottomHalfW * 2),
    sideLegHemWidth: r1(sideLegFlat),
  };

  return { pieces, measurements };
}

// ─── KADIN KULOT — 3 PARCA ──────────────────────────────────

function generateFemalePantyPieces(
  size: SizeKey,
  options: PatternOptions = {},
): { pieces: PatternPiece[]; measurements: Record<string, number> } {
  const sd = FEMALE_PANTY_SIZES[size];
  const ease = { ...EASE_PROFILES.FEMALE_PANTY, ...options.easeOverride };

  const waistCirc = sd.belCevresiCm;
  const hipCirc = sd.yarimGenCm * 4;
  const patternH = sd.kalipBoyCm;

  const shrinkX = options.includeShrinkage ? (1 + SHRINKAGE.crosswise) : 1;
  const shrinkY = options.includeShrinkage ? (1 + SHRINKAGE.lengthwise) : 1;

  // Gusset astar sabitleri
  const gussetW = 7 + (getSizeIndex(size) * 0.5); // 7-9cm bedene gore
  const gussetLen = 14; // cm sabit

  // ──────── ON PANEL ────────
  // Kelebek/kalkan sekli — belden kasiga daralan, V kesim bacak acikligi
  // Endustri standardi: on panel bel = waistCirc/4 - 0.5cm, kalca = hipCirc/4 - 1cm
  const fpWaistHalf = (waistCirc / 4 - 0.5) * (1 + ease.waist) * shrinkX;
  const fpHeight = patternH * shrinkY;
  const fpCrotchW = gussetW * 0.5 * 0.5; // ~2cm — dar kasik
  const fpWaistDip = 1.2;
  const fpHipY = fpHeight * 0.38;
  const fpHipHalfW = (hipCirc / 4 - 1) * (1 + ease.hip) * shrinkX;
  const fpCx = fpHipHalfW;
  const fpW = fpHipHalfW * 2;

  // V-kesim: Bacak acikligi yukari dogru V seklinde
  const fpLegY = fpHeight * 0.65; // V noktasi yuksekligi

  const fpPath = [
    `M ${r2(fpCx - fpWaistHalf)} 0`,
    // Bel egrisi — icbukey
    `Q ${r2(fpCx)} ${r2(fpWaistDip)}, ${r2(fpCx + fpWaistHalf)} 0`,
    // Sag yan: belden kalcaya
    `L ${r2(fpCx + fpHipHalfW)} ${r2(fpHipY)}`,
    // Sag bacak V-kesimi — cubic bezier
    `C ${r2(fpCx + fpHipHalfW)} ${r2(fpHipY + (fpLegY - fpHipY) * 0.6)}, ${r2(fpCx + fpHipHalfW * 0.7)} ${r2(fpLegY)}, ${r2(fpCx + fpCrotchW * 1.8)} ${r2(fpLegY)}`,
    // Kasiga inis
    `C ${r2(fpCx + fpCrotchW * 1.4)} ${r2(fpLegY + (fpHeight - fpLegY) * 0.5)}, ${r2(fpCx + fpCrotchW * 1.1)} ${r2(fpHeight * 0.92)}, ${r2(fpCx + fpCrotchW)} ${r2(fpHeight)}`,
    // Kasik tabani
    `L ${r2(fpCx - fpCrotchW)} ${r2(fpHeight)}`,
    // Sol kasiga cikis (simetrik)
    `C ${r2(fpCx - fpCrotchW * 1.1)} ${r2(fpHeight * 0.92)}, ${r2(fpCx - fpCrotchW * 1.4)} ${r2(fpLegY + (fpHeight - fpLegY) * 0.5)}, ${r2(fpCx - fpCrotchW * 1.8)} ${r2(fpLegY)}`,
    // Sol bacak V-kesimi
    `C ${r2(fpCx - fpHipHalfW * 0.7)} ${r2(fpLegY)}, ${r2(fpCx - fpHipHalfW)} ${r2(fpHipY + (fpLegY - fpHipY) * 0.6)}, ${r2(fpCx - fpHipHalfW)} ${r2(fpHipY)}`,
    // Sol yan
    `L ${r2(fpCx - fpWaistHalf)} 0`,
    `Z`,
  ].join(" ");

  const frontPiece: PatternPiece = {
    name: "front_panel",
    label: "On Panel",
    svgPath: fpPath,
    points: [
      { x: fpCx - fpWaistHalf, y: 0 },
      { x: fpCx + fpWaistHalf, y: 0 },
      { x: fpCx + fpHipHalfW, y: fpHipY },
      { x: fpCx + fpCrotchW, y: fpHeight },
      { x: fpCx - fpCrotchW, y: fpHeight },
      { x: fpCx - fpHipHalfW, y: fpHipY },
    ],
    grainLine: { start: { x: fpCx, y: 2 }, end: { x: fpCx, y: fpHeight - 2 } },
    notches: [
      { x: fpCx + fpHipHalfW, y: fpHipY },
      { x: fpCx - fpHipHalfW, y: fpHipY },
      { x: fpCx, y: 0 },
    ],
    color: PIECE_COLORS.front_panel,
    width: r1(fpW),
    height: r1(fpHeight),
    areaCm2: r1(estimateArea(fpW, fpHeight, 0.55)),
    grainAngle: 0,
    seamType: "flatlock",
    offsetX: 0,
    offsetY: 0,
  };

  // ──────── ARKA PANEL ────────
  // On panele benzer ama daha genis, oturma bolgesi genis, kasik derin
  // Endustri standardi: arka panel bel = waistCirc/4 + 0.5cm (onden 1cm genis)
  const bpWaistHalf = (waistCirc / 4 + 0.5) * (1 + ease.waist) * shrinkX;
  const bpRise = 2; // cm
  const bpHeight = (patternH + bpRise) * shrinkY;
  const bpCrotchW = gussetW * 0.5 * 0.55;
  const bpWaistDip = 1.8;
  const bpHipY = bpHeight * 0.33;
  const bpHipHalfW = (hipCirc / 4 + 1) * (1 + ease.hip) * shrinkX; // Oturma bolgesi — hipCirc/4 + 1cm
  const bpCx = bpHipHalfW;
  const bpW = bpHipHalfW * 2;
  const bpLegY = bpHeight * 0.60;

  const bpPath = [
    `M ${r2(bpCx - bpWaistHalf)} 0`,
    `Q ${r2(bpCx)} ${r2(bpWaistDip)}, ${r2(bpCx + bpWaistHalf)} 0`,
    `L ${r2(bpCx + bpHipHalfW)} ${r2(bpHipY)}`,
    // Sag bacak V-kesimi — daha derin
    `C ${r2(bpCx + bpHipHalfW)} ${r2(bpHipY + (bpLegY - bpHipY) * 0.55)}, ${r2(bpCx + bpHipHalfW * 0.65)} ${r2(bpLegY)}, ${r2(bpCx + bpCrotchW * 2)} ${r2(bpLegY)}`,
    `C ${r2(bpCx + bpCrotchW * 1.5)} ${r2(bpLegY + (bpHeight - bpLegY) * 0.5)}, ${r2(bpCx + bpCrotchW * 1.2)} ${r2(bpHeight * 0.90)}, ${r2(bpCx + bpCrotchW)} ${r2(bpHeight)}`,
    `L ${r2(bpCx - bpCrotchW)} ${r2(bpHeight)}`,
    `C ${r2(bpCx - bpCrotchW * 1.2)} ${r2(bpHeight * 0.90)}, ${r2(bpCx - bpCrotchW * 1.5)} ${r2(bpLegY + (bpHeight - bpLegY) * 0.5)}, ${r2(bpCx - bpCrotchW * 2)} ${r2(bpLegY)}`,
    `C ${r2(bpCx - bpHipHalfW * 0.65)} ${r2(bpLegY)}, ${r2(bpCx - bpHipHalfW)} ${r2(bpHipY + (bpLegY - bpHipY) * 0.55)}, ${r2(bpCx - bpHipHalfW)} ${r2(bpHipY)}`,
    `L ${r2(bpCx - bpWaistHalf)} 0`,
    `Z`,
  ].join(" ");

  const backPiece: PatternPiece = {
    name: "back_panel",
    label: "Arka Panel",
    svgPath: bpPath,
    points: [
      { x: bpCx - bpWaistHalf, y: 0 },
      { x: bpCx + bpWaistHalf, y: 0 },
      { x: bpCx + bpHipHalfW, y: bpHipY },
      { x: bpCx + bpCrotchW, y: bpHeight },
      { x: bpCx - bpCrotchW, y: bpHeight },
      { x: bpCx - bpHipHalfW, y: bpHipY },
    ],
    grainLine: { start: { x: bpCx, y: 2 }, end: { x: bpCx, y: bpHeight - 2 } },
    notches: [
      { x: bpCx + bpHipHalfW, y: bpHipY },
      { x: bpCx + bpHipHalfW, y: bpHipY + 1 },
      { x: bpCx - bpHipHalfW, y: bpHipY },
      { x: bpCx - bpHipHalfW, y: bpHipY + 1 },
    ],
    color: PIECE_COLORS.back_panel,
    width: r1(bpW),
    height: r1(bpHeight),
    areaCm2: r1(estimateArea(bpW, bpHeight, 0.52)),
    grainAngle: 0,
    seamType: "flatlock",
    offsetX: 0,
    offsetY: 0,
  };

  // ──────── AG ASTARI ────────
  // Oval dikdortgen — kenarlar yuvarlak
  const gRx = 2.0;
  const gRy = 1.5;

  const gPath = [
    `M ${r2(gRx)} 0`,
    `L ${r2(gussetW - gRx)} 0`,
    `Q ${r2(gussetW)} 0, ${r2(gussetW)} ${r2(gRy)}`,
    `L ${r2(gussetW)} ${r2(gussetLen - gRy)}`,
    `Q ${r2(gussetW)} ${r2(gussetLen)}, ${r2(gussetW - gRx)} ${r2(gussetLen)}`,
    `L ${r2(gRx)} ${r2(gussetLen)}`,
    `Q 0 ${r2(gussetLen)}, 0 ${r2(gussetLen - gRy)}`,
    `L 0 ${r2(gRy)}`,
    `Q 0 0, ${r2(gRx)} 0`,
    `Z`,
  ].join(" ");

  const gussetPiece: PatternPiece = {
    name: "gusset_lining",
    label: "Ag Astari",
    svgPath: gPath,
    points: [
      { x: gRx, y: 0 },
      { x: gussetW - gRx, y: 0 },
      { x: gussetW, y: gRy },
      { x: gussetW, y: gussetLen - gRy },
      { x: gussetW - gRx, y: gussetLen },
      { x: gRx, y: gussetLen },
      { x: 0, y: gussetLen - gRy },
      { x: 0, y: gRy },
    ],
    grainLine: { start: { x: gussetW / 2, y: 1 }, end: { x: gussetW / 2, y: gussetLen - 1 } },
    notches: [
      { x: 0, y: gussetLen / 2 },
      { x: gussetW, y: gussetLen / 2 },
    ],
    color: PIECE_COLORS.gusset_lining,
    width: r1(gussetW),
    height: gussetLen,
    areaCm2: r1(gussetW * gussetLen * 0.90),
    grainAngle: 0,
    seamType: "overlock",
    offsetX: 0,
    offsetY: 0,
  };

  const pieces = [frontPiece, backPiece, gussetPiece];

  // Yerlesimleri hesapla
  const gap = 3;
  let curX = 0;
  for (const p of pieces) {
    p.offsetX = curX;
    p.offsetY = 0;
    curX += p.width + gap;
  }

  const measurements: Record<string, number> = {
    hipCirc,
    waistCirc,
    patternHeight: patternH,
    frontPanelWidth: r1(fpW),
    frontPanelHeight: r1(fpHeight),
    backPanelWidth: r1(bpW),
    backPanelHeight: r1(bpHeight),
    gussetWidth: r1(gussetW),
    gussetLength: gussetLen,
  };

  return { pieces, measurements };
}

// ─── PATTERN BUILDER ─────────────────────────────────────────

function buildPattern(
  modelType: ModelType,
  gender: "male" | "female",
  size: SizeKey,
  piecesData: { pieces: PatternPiece[]; measurements: Record<string, number> },
  options: PatternOptions = {},
): Pattern {
  const { pieces, measurements } = piecesData;

  const totalAreaCm2 = pieces.reduce((s, p) => s + p.areaCm2, 0);

  // Dikis payi ekle
  const defaultSeam = options.seamAllowance || "flatlock";
  const seamCm = SEAM_ALLOWANCES[defaultSeam];
  const totalAreaWithSeamCm2 = pieces.reduce((sum, p) => {
    const perimeter = 2 * (p.width + p.height);
    return sum + p.areaCm2 + perimeter * seamCm;
  }, 0);

  // Gercek kumak alani (fire dahil)
  const realFabricArea = totalAreaWithSeamCm2 * 1.10; // %10 fire

  const hipCirc = measurements.hipCirc || 0;
  const waistCirc = measurements.waistCirc || 0;
  const patternHeight = measurements.patternHeight || 0;

  return {
    modelType,
    size,
    gender,
    pieces,
    totalAreaCm2: r1(totalAreaCm2),
    totalAreaWithSeamCm2: r1(totalAreaWithSeamCm2),
    realFabricArea: r1(realFabricArea),
    fabricAreaM2: r2(totalAreaWithSeamCm2 / 10000),
    measurements,
    metadata: {
      waistCirc,
      hipCirc,
      patternHeight,
      seamType: {
        side: "flatlock" as SeamType,
        crotch: "overlock" as SeamType,
        waist: "coverlock" as SeamType,
        leg: "coverlock" as SeamType,
      },
    },
  };
}

// ─── ANA FONKSİYONLAR ──────────────────────────────────────

/**
 * Ana kalip uretme fonksiyonu.
 * modelType'a gore uygun kalip hesabini cagirir.
 */
export function generatePattern(
  modelType: ModelType,
  size: SizeKey,
  options: PatternOptions = {},
): Pattern {
  switch (modelType) {
    case "boxer_brief":
    case "trunk": {
      const data = generateMaleBoxerPieces(size, options);
      const pattern = buildPattern(modelType, "male", size, data, options);

      // Trunk icin bacak boyunu kisalt (on, arka VE yan panel)
      if (modelType === "trunk") {
        const heightReduction = 0.75;
        pattern.pieces = pattern.pieces.map((p) => {
          if (p.name === "front_panel" || p.name === "back_panel" || p.name === "side_panel") {
            return {
              ...p,
              height: r1(p.height * heightReduction),
              areaCm2: r1(p.areaCm2 * heightReduction),
              // svgPath'i Y ekseninde scale et
              svgPath: scalePathY(p.svgPath, heightReduction),
              points: p.points.map((pt) => ({ x: pt.x, y: pt.y * heightReduction })),
            };
          }
          return p;
        });
        pattern.totalAreaCm2 = r1(pattern.pieces.reduce((s, p) => s + p.areaCm2, 0));
        pattern.totalAreaWithSeamCm2 = r1(pattern.totalAreaCm2 * 1.05);
        pattern.fabricAreaM2 = r2(pattern.totalAreaWithSeamCm2 / 10000);
      }
      return pattern;
    }
    case "bikini":
    case "hipster": {
      const data = generateFemalePantyPieces(size, options);
      const pattern = buildPattern(modelType, "female", size, data, options);

      // Hipster icin bel hattini dusur
      if (modelType === "hipster") {
        const heightReduction = 0.88;
        pattern.pieces = pattern.pieces.map((p) => {
          if (p.name === "front_panel" || p.name === "back_panel") {
            return {
              ...p,
              height: r1(p.height * heightReduction),
              areaCm2: r1(p.areaCm2 * heightReduction),
              svgPath: scalePathY(p.svgPath, heightReduction),
              points: p.points.map((pt) => ({ x: pt.x, y: pt.y * heightReduction })),
            };
          }
          return p;
        });
        pattern.totalAreaCm2 = r1(pattern.pieces.reduce((s, p) => s + p.areaCm2, 0));
        pattern.totalAreaWithSeamCm2 = r1(pattern.totalAreaCm2 * 1.05);
        pattern.fabricAreaM2 = r2(pattern.totalAreaWithSeamCm2 / 10000);
      }
      return pattern;
    }
    default:
      throw new Error(`Bilinmeyen model tipi: ${modelType}`);
  }
}

/** SVG path'deki Y koordinatlarini scale et */
function scalePathY(path: string, factor: number): string {
  // scalePathXY tokenizer'i virgul/bosluk ayiricilari dogru isler
  return scalePathXY(path, 1, factor);
}

/**
 * Beden grading — temel kaliptan hedef bedene olcekleme.
 */
export function gradePattern(basePattern: Pattern, targetSize: SizeKey): Pattern {
  const baseIdx = getSizeIndex(basePattern.size);
  const targetIdx = getSizeIndex(targetSize);

  if (baseIdx === targetIdx) return basePattern;

  // Adim adim grading uygula
  let cumulativeWaistDelta = 0;
  let cumulativeHipDelta = 0;
  let cumulativeLegDelta = 0;

  const step = targetIdx > baseIdx ? 1 : -1;
  for (let i = baseIdx; i !== targetIdx; i += step) {
    const fromSize = SIZE_ORDER[i];
    const toSize = SIZE_ORDER[i + step];
    const gradingKey = step > 0
      ? `${fromSize}-${toSize}` as keyof typeof GRADING_TABLE.waist
      : `${toSize}-${fromSize}` as keyof typeof GRADING_TABLE.waist;

    const waistStep = GRADING_TABLE.waist[gradingKey] ?? 4;
    const hipStep = GRADING_TABLE.hip[gradingKey] ?? 4;
    const legStep = GRADING_TABLE.leg[gradingKey] ?? 2;

    cumulativeWaistDelta += waistStep * step;
    cumulativeHipDelta += hipStep * step;
    cumulativeLegDelta += legStep * step;
  }

  const baseHip = basePattern.metadata.hipCirc;
  const baseWaist = basePattern.metadata.waistCirc;
  const scaleX = (baseHip + cumulativeHipDelta) / baseHip;
  const scaleY = 1 + (cumulativeWaistDelta / baseWaist) * 0.3;

  const newPieces = basePattern.pieces.map((piece) => ({
    ...piece,
    width: r1(piece.width * scaleX),
    height: r1(piece.height * scaleY),
    areaCm2: r1(piece.areaCm2 * scaleX * scaleY),
    svgPath: scalePathXY(piece.svgPath, scaleX, scaleY),
    points: piece.points.map((pt) => ({
      x: r2(pt.x * scaleX),
      y: r2(pt.y * scaleY),
    })),
    grainLine: {
      start: { x: r2(piece.grainLine.start.x * scaleX), y: r2(piece.grainLine.start.y * scaleY) },
      end: { x: r2(piece.grainLine.end.x * scaleX), y: r2(piece.grainLine.end.y * scaleY) },
    },
    notches: piece.notches.map((n) => ({
      x: r2(n.x * scaleX),
      y: r2(n.y * scaleY),
    })),
  }));

  // Offsetleri yeniden hesapla
  const gap = 3;
  let curX = 0;
  for (const p of newPieces) {
    p.offsetX = curX;
    p.offsetY = 0;
    curX += p.width + gap;
  }

  const totalAreaCm2 = r1(newPieces.reduce((s, p) => s + p.areaCm2, 0));

  return {
    ...basePattern,
    size: targetSize,
    pieces: newPieces,
    totalAreaCm2,
    totalAreaWithSeamCm2: r1(totalAreaCm2 * 1.05),
    fabricAreaM2: r2((totalAreaCm2 * 1.05) / 10000),
    realFabricArea: r1(totalAreaCm2 * 1.05 * 1.10),
    metadata: {
      ...basePattern.metadata,
      waistCirc: baseWaist + cumulativeWaistDelta,
      hipCirc: baseHip + cumulativeHipDelta,
    },
  };
}

/** SVG path'deki X ve Y koordinatlarini scale et */
function scalePathXY(path: string, fx: number, fy: number): string {
  // SVG path'teki tum sayi ciftlerini (x,y) scale et
  // Virgul ve bosluk ayiricilari desteklenir
  const tokens = path.match(/[A-Za-z]|[-+]?\d*\.?\d+/g);
  if (!tokens) return path;

  const result: string[] = [];
  let isX = true; // x,y sirayla

  for (const token of tokens) {
    if (/^[A-Za-z]$/.test(token)) {
      result.push(token);
      isX = true; // yeni komut, x ile basla
      if (token.toUpperCase() === "Z") continue;
    } else {
      const num = parseFloat(token);
      if (isX) {
        result.push(r2(num * fx).toString());
      } else {
        result.push(r2(num * fy).toString());
      }
      isX = !isX;
    }
  }

  return result.join(" ");
}

/**
 * Kalip dogrulama — cevre eslestirme ve uyumluluk kontrolleri.
 */
export function validatePattern(pattern: Pattern): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: { name: string; passed: boolean; message: string; value?: number }[] = [];

  const front = pattern.pieces.find((p) => p.name === "front_panel");
  const back = pattern.pieces.find((p) => p.name === "back_panel");
  const gusset = pattern.pieces.find((p) =>
    p.name === "gusset" || p.name === "gusset_lining",
  );

  // 1. Temel parcalar mevcut mu?
  if (!front || !back) {
    errors.push("On ve arka panel bulunamadi.");
    checks.push({ name: "Temel parcalar", passed: false, message: "On/arka panel eksik" });
    return { valid: false, isValid: false, checks, errors, warnings };
  }
  checks.push({ name: "Temel parcalar", passed: true, message: "On ve arka panel mevcut" });

  // 2. Yan dikis uzunlugu kontrolu (+-2mm tolerans)
  const frontSideLen = front.height;
  const backSideLen = back.height;
  const sideDiff = Math.abs(frontSideLen - backSideLen);

  if (pattern.gender === "male" && pattern.modelType !== "trunk") {
    if (sideDiff > 5) {
      errors.push(
        `Yan dikis farki cok buyuk: on=${frontSideLen.toFixed(1)}cm, arka=${backSideLen.toFixed(1)}cm (fark: ${sideDiff.toFixed(1)}cm)`,
      );
      checks.push({ name: "Yan dikis", passed: false, message: `Fark: ${sideDiff.toFixed(1)}cm`, value: sideDiff });
    } else {
      checks.push({ name: "Yan dikis", passed: true, message: `Fark: ${sideDiff.toFixed(1)}cm (backRise dahil)`, value: sideDiff });
    }
  } else if (pattern.gender === "female") {
    const ok = sideDiff <= 5;
    if (!ok) {
      warnings.push(
        `Yan dikis farki: on=${frontSideLen.toFixed(1)}cm, arka=${backSideLen.toFixed(1)}cm`,
      );
    }
    checks.push({ name: "Yan dikis", passed: ok, message: `Fark: ${sideDiff.toFixed(1)}cm`, value: sideDiff });
  }

  // 3. Ag parcasi kontrolu
  if (gusset) {
    const gW = gusset.width;
    let gOk = true;
    if (gW < 5) {
      warnings.push(`Ag genisligi cok dar: ${gW.toFixed(1)}cm`);
      gOk = false;
    }
    if (gW > 12) {
      warnings.push(`Ag genisligi cok genis: ${gW.toFixed(1)}cm`);
      gOk = false;
    }
    checks.push({ name: "Ag parcasi", passed: gOk, message: `Genislik: ${gW.toFixed(1)}cm`, value: gW });
  }

  // 4. Bel / kalca cevresi kontrolu
  const easeWaist = pattern.gender === "male"
    ? EASE_PROFILES.MALE_BOXER.waist
    : EASE_PROFILES.FEMALE_PANTY.waist;

  const wb = pattern.pieces.find((p) => p.name === "waistband");
  const side = pattern.pieces.find((p) => p.name === "side_panel");

  let calculatedCirc: number;
  let expectedCirc: number;
  let circLabel: string;

  if (wb) {
    // Erkek boxer — bel bandi × 2 = bel cevresi
    calculatedCirc = wb.width * 2;
    expectedCirc = pattern.metadata.waistCirc * (1 + easeWaist);
    circLabel = "Bel cevresi";
  } else {
    // Kadin kulot — bel bandi yok, panel genislikleri = kalca cevresi
    const easeHip = pattern.gender === "male"
      ? EASE_PROFILES.MALE_BOXER.hip
      : EASE_PROFILES.FEMALE_PANTY.hip;
    calculatedCirc = front.width + back.width + (side ? side.width * 2 : 0);
    expectedCirc = pattern.metadata.hipCirc * (1 + easeHip);
    circLabel = "Kalca cevresi";
  }

  const circDiffPercent = Math.abs(calculatedCirc - expectedCirc) / expectedCirc;

  if (circDiffPercent > 0.15) {
    warnings.push(
      `${circLabel} uyumsuzlugu: hesaplanan=${calculatedCirc.toFixed(1)}cm, beklenen=${expectedCirc.toFixed(1)}cm (fark: ${(circDiffPercent * 100).toFixed(1)}%)`,
    );
  }
  checks.push({
    name: circLabel,
    passed: circDiffPercent <= 0.15,
    message: `Hesaplanan: ${calculatedCirc.toFixed(1)}cm, beklenen: ${expectedCirc.toFixed(1)}cm`,
    value: circDiffPercent,
  });

  // 5. Alan kontrolu
  const areaOk = pattern.totalAreaCm2 >= 200 && pattern.totalAreaCm2 <= 5000;
  if (pattern.totalAreaCm2 < 200) {
    errors.push(`Toplam alan cok kucuk: ${pattern.totalAreaCm2.toFixed(0)}cm2`);
  }
  if (pattern.totalAreaCm2 > 5000) {
    errors.push(`Toplam alan cok buyuk: ${pattern.totalAreaCm2.toFixed(0)}cm2`);
  }
  checks.push({
    name: "Toplam alan",
    passed: areaOk,
    message: `${pattern.totalAreaCm2.toFixed(0)}cm2`,
    value: pattern.totalAreaCm2,
  });

  // 6. Parca ust uste binme kontrolu
  let overlapOk = true;
  for (let i = 0; i < pattern.pieces.length; i++) {
    for (let j = i + 1; j < pattern.pieces.length; j++) {
      const a = pattern.pieces[i];
      const b = pattern.pieces[j];
      const aRight = a.offsetX + a.width;
      const bLeft = b.offsetX;
      if (aRight > bLeft + 0.1) {
        overlapOk = false;
        errors.push(`Parcalar ust uste biniyor: ${a.label} ve ${b.label}`);
      }
    }
  }
  checks.push({ name: "Ust uste binme", passed: overlapOk, message: overlapOk ? "Parcalar ayri" : "Carpma tespit edildi" });

  const valid = errors.length === 0;
  return { valid, isValid: valid, checks, errors, warnings };
}

/**
 * Kalip parcalarindan SVG string uretir.
 * Bezier egrili gercekci kalip gorseli.
 *
 * @param pattern - Kalip verisi
 * @param scale - 1cm = kac px (varsayilan 4)
 */
export function patternToSVG(pattern: Pattern, scale: number = 4): string {
  const paddingCm = 2; // cm padding
  const pad = paddingCm * scale;
  const gapCm = 3;
  const gap = gapCm * scale;

  // Baslik icin ust bosluk
  const headerHeight = 24; // px

  // Toplam genislik ve yukseklik hesapla
  let totalWidthCm = paddingCm;
  let maxHeightCm = 0;

  for (let i = 0; i < pattern.pieces.length; i++) {
    totalWidthCm += pattern.pieces[i].width;
    if (i < pattern.pieces.length - 1) totalWidthCm += gapCm;
    maxHeightCm = Math.max(maxHeightCm, pattern.pieces[i].height);
  }
  totalWidthCm += paddingCm;

  const svgWidth = Math.ceil(totalWidthCm * scale);
  const svgHeight = Math.ceil(maxHeightCm * scale + pad * 2 + headerHeight + 20); // +20 etiketler icin

  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">`,
  );

  // Arka plan
  parts.push(`  <rect width="${svgWidth}" height="${svgHeight}" fill="#FAFAFA" />`);

  // Baslik
  const genderLabel = pattern.gender === "male" ? "Erkek" : "Kadin";
  parts.push(
    `  <text x="${svgWidth / 2}" y="16" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#374151">${pattern.modelType.toUpperCase()} - ${pattern.size} - ${genderLabel}</text>`,
  );

  // Her parca icin SVG olustur
  let offsetXpx = pad;

  for (const piece of pattern.pieces) {
    const pxW = piece.width * scale;
    const pxH = piece.height * scale;
    const originY = pad + headerHeight;

    parts.push(`  <g transform="translate(${r1(offsetXpx)}, ${r1(originY)})">`);

    // Path olustur — svgPath'i scale et
    const scaledPath = piece.svgPath.replace(
      /(-?\d+\.?\d*)/g,
      (match, num, offset, fullStr) => {
        // Komut harflerini atla
        const prevChar = fullStr[offset - 1];
        if (prevChar && /[A-Za-z]/.test(prevChar) && !/\d/.test(prevChar)) {
          // Ilk koordinat (hemen komuttan sonra)
        }
        return r2(parseFloat(num) * scale).toString();
      },
    );

    // Daha guvenilir scale: path'i parse edip tekrar olustur
    const finalPath = scalePathXY(piece.svgPath, scale, scale);

    parts.push(
      `    <path d="${finalPath}" fill="${piece.color}" fill-opacity="0.15" stroke="${piece.color}" stroke-width="2" />`,
    );

    // Grain line (kesikli cizgi)
    const glX1 = r1(piece.grainLine.start.x * scale);
    const glY1 = r1(piece.grainLine.start.y * scale);
    const glX2 = r1(piece.grainLine.end.x * scale);
    const glY2 = r1(piece.grainLine.end.y * scale);
    parts.push(
      `    <line x1="${glX1}" y1="${glY1}" x2="${glX2}" y2="${glY2}" stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="4 4" />`,
    );

    // Grain line ok ucu
    const arrowX = glX2;
    const arrowY = glY2;
    parts.push(
      `    <polygon points="${r1(arrowX - 3)},${r1(arrowY - 6)} ${r1(arrowX + 3)},${r1(arrowY - 6)} ${r1(arrowX)},${r1(arrowY)}" fill="#94A3B8" />`,
    );

    // Notch (centik) noktalari — kucuk ucgenler (3px)
    for (const notch of piece.notches) {
      const nx = r1(notch.x * scale);
      const ny = r1(notch.y * scale);
      parts.push(
        `    <polygon points="${r1(nx - 3)},${ny} ${r1(nx + 3)},${ny} ${nx},${r1(ny + 5)}" fill="${piece.color}" />`,
      );
    }

    // Parca etiketi — altinda
    parts.push(
      `    <text x="${r1(pxW / 2)}" y="${r1(pxH + 14)}" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#6B7280">${piece.label} (${piece.width.toFixed(1)}\u00D7${piece.height.toFixed(1)}cm)</text>`,
    );

    parts.push(`  </g>`);

    offsetXpx += pxW + gap;
  }

  parts.push(`</svg>`);

  return parts.join("\n");
}

/**
 * Gercek kumak alani hesabi — dikis payi, ease, cekme payi dahil.
 * m2 cinsinden doner.
 */
export function calculateRealFabricArea(pattern: Pattern): number {
  let totalCm2 = 0;

  for (const piece of pattern.pieces) {
    let area = piece.areaCm2;

    // Dikis payi ekle (cevre x dikis payi genisligi)
    const perimeter = 2 * (piece.width + piece.height);
    const seamType = (pattern.metadata.seamType.side || "flatlock") as SeamType;
    area += perimeter * SEAM_ALLOWANCES[seamType];

    // Cekme payi ekle
    area *= (1 + SHRINKAGE.lengthwise) * (1 + SHRINKAGE.crosswise);

    totalCm2 += area;
  }

  // Simetrik parcalar (on/arka panel, yan panel) 2 adet kesilir — ag tekil
  const symmetricArea = pattern.pieces.reduce((sum, p) => {
    if (p.name === "gusset" || p.name === "gusset_lining" || p.name === "waistband") {
      return sum; // tekil parcalar
    }
    return sum + p.areaCm2;
  }, 0);

  // Toplam: tum parcalar + simetrik parcalarin fazladan 1 kopyasi
  const finalCm2 = totalCm2 + symmetricArea * (1 + SHRINKAGE.lengthwise) * (1 + SHRINKAGE.crosswise);

  return finalCm2 / 10000; // m2'ye cevir
}
