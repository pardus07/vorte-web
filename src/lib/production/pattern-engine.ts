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
  inset:         "#EF4444",
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

// ─── ERKEK BOXER BRİEF — FreeSewing Bruce Referansı ─────────
// 4 parça: Arka (1 katlı) + Ön (×2 ayna) + Yan (×2 ayna) + İç Parça (×2 ayna)
// Toplam kesim: 7 adet kumaş parçası + bel lastiği

function generateMaleBoxerPieces(
  size: SizeKey,
  options: PatternOptions = {},
): { pieces: PatternPiece[]; measurements: Record<string, number> } {
  const sd = MALE_BOXER_SIZES[size];
  const ease = { ...EASE_PROFILES.MALE_BOXER, ...options.easeOverride };

  // Temel ölçüler
  const hipCirc = sd.yarimGenCm * 4;
  const waistCirc = sd.belCevresiCm;
  const totalH = sd.kalipBoyCm;

  const shrinkX = options.includeShrinkage ? (1 + SHRINKAGE.crosswise) : 1;
  const shrinkY = options.includeShrinkage ? (1 + SHRINKAGE.lengthwise) : 1;
  const pacaCirc = sd.pacaCevresiCm;

  // ── FreeSewing Bruce oranlari ──
  const BACK_HIP = 0.315;   // Arka: kalca cevresinin %31.5'i
  const FRONT_HIP = 0.245;  // On: kalca cevresinin %24.5'i
  const SIDE_HIP = (1 - BACK_HIP - FRONT_HIP) / 2; // ~0.22 per side
  const FRONT_H = 0.35;     // On yukseklik: toplam boy × %35
  const INSET_H = 0.65;     // Ic parca yukseklik: toplam boy × %65
  const LEG_BACK = 0.32;    // Arka bacak payi
  const LEG_INSET = 0.30;   // Ic parca bacak payi
  const GUSSET_R = 0.0666;  // Kasik genisligi: kalca × %6.66
  const BACK_RISE = 3.5;    // Arka yukselme (cm)

  const gussetW = r1(hipCirc * GUSSET_R); // ~7.5cm (M)
  const gussetHW = gussetW / 2;

  // Bel lastigi (kalip parcasi degil — hazir logolu lastik)
  const elasticWidthCm = 4;
  const elasticLengthCm = r1(waistCirc * 0.85);

  // ════════════ 1. ARKA PANEL ════════════
  // Pentagon/kalkan sekli — en buyuk parca, katli kesim (simetrik)
  // Altta kasik kavisi, yanlarda paca acikliklari
  const backHipHW = (hipCirc * BACK_HIP * (1 + ease.hip) * shrinkX) / 2;
  const backWaistHW = backHipHW * 0.88;
  const backH = (totalH + BACK_RISE) * shrinkY;
  const backHipY = backH * 0.28;
  const backWaistDip = 2.0; // bel egrisi — yanlar merkeze gore dusuk
  const crotchArchH = backH * 0.18; // kasik kavisi derinligi
  const backLegW = (pacaCirc / 2) * LEG_BACK * (1 + ease.leg) * shrinkX;

  const bcx = backHipHW;
  const backW = backHipHW * 2;
  const backLegInnerX = gussetHW + backLegW; // ic bacak noktasi (merkezden)

  const backPath = [
    `M ${r2(bcx - backWaistHW)} ${r2(backWaistDip)}`,
    `Q ${r2(bcx)} 0, ${r2(bcx + backWaistHW)} ${r2(backWaistDip)}`,
    `L ${r2(bcx + backHipHW)} ${r2(backHipY)}`,
    `L ${r2(bcx + backHipHW)} ${r2(backH)}`,
    `L ${r2(bcx + backLegInnerX)} ${r2(backH)}`,
    `Q ${r2(bcx + gussetHW)} ${r2(backH - crotchArchH * 0.55)}, ${r2(bcx)} ${r2(backH - crotchArchH)}`,
    `Q ${r2(bcx - gussetHW)} ${r2(backH - crotchArchH * 0.55)}, ${r2(bcx - backLegInnerX)} ${r2(backH)}`,
    `L ${r2(bcx - backHipHW)} ${r2(backH)}`,
    `L ${r2(bcx - backHipHW)} ${r2(backHipY)}`,
    `L ${r2(bcx - backWaistHW)} ${r2(backWaistDip)}`,
    `Z`,
  ].join(" ");

  const backPiece: PatternPiece = {
    name: "back_panel",
    label: "Arka Panel",
    svgPath: backPath,
    points: [
      { x: bcx - backWaistHW, y: backWaistDip },
      { x: bcx + backWaistHW, y: backWaistDip },
      { x: bcx + backHipHW, y: backHipY },
      { x: bcx + backHipHW, y: backH },
      { x: bcx + backLegInnerX, y: backH },
      { x: bcx, y: backH - crotchArchH },
      { x: bcx - backLegInnerX, y: backH },
      { x: bcx - backHipHW, y: backH },
      { x: bcx - backHipHW, y: backHipY },
    ],
    grainLine: { start: { x: bcx, y: 3 }, end: { x: bcx, y: backH - crotchArchH - 3 } },
    notches: [
      { x: bcx + backHipHW, y: backHipY },
      { x: bcx - backHipHW, y: backHipY },
      { x: bcx, y: backH - crotchArchH },
    ],
    color: PIECE_COLORS.back_panel,
    width: r1(backW),
    height: r1(backH),
    areaCm2: r1(estimateArea(backW, backH, 0.78)),
    grainAngle: 0,
    seamType: "flatlock",
    offsetX: 0,
    offsetY: 0,
  };

  // ════════════ 2. ON PANEL (×2 ayna cift) ════════════
  // Kisa, genis parca — tusk (dis) cikintilariyla pouch olusturur
  // Iki adet kesilir, ust uste katlanir, dart dikilerek 3D kese olusur
  const frontW = hipCirc * FRONT_HIP * (1 + ease.hip) * shrinkX;
  const frontH = totalH * FRONT_H * shrinkY;
  const frontWaistW = frontW * 0.92;
  const frontWaistDip = 1.0;
  const tuskW = gussetW * 0.40;
  const tuskH = frontH * 0.35;
  const frontTotalH = frontH + tuskH;
  const frontCurveY = frontH * 0.45; // inset egri baslangici
  const fcx = frontW / 2;

  const frontPath = [
    `M ${r2(fcx - frontWaistW / 2)} ${r2(frontWaistDip)}`,
    `Q ${r2(fcx)} 0, ${r2(fcx + frontWaistW / 2)} ${r2(frontWaistDip)}`,
    // Sag yan kenar (side panel'e baglanir)
    `L ${r2(frontW)} ${r2(frontCurveY)}`,
    // Sag egri (inset'e baglanan kavis) → tusk
    `C ${r2(frontW)} ${r2(frontH * 0.72)}, ${r2(fcx + tuskW * 2)} ${r2(frontH * 0.88)}, ${r2(fcx + tuskW)} ${r2(frontTotalH)}`,
    // Sag tusk ici
    `L ${r2(fcx + tuskW * 0.2)} ${r2(frontTotalH)}`,
    // Dart noktasi (merkez)
    `L ${r2(fcx)} ${r2(frontH * 0.82)}`,
    // Sol tusk
    `L ${r2(fcx - tuskW * 0.2)} ${r2(frontTotalH)}`,
    `L ${r2(fcx - tuskW)} ${r2(frontTotalH)}`,
    // Sol egri (simetrik)
    `C ${r2(fcx - tuskW * 2)} ${r2(frontH * 0.88)}, 0 ${r2(frontH * 0.72)}, 0 ${r2(frontCurveY)}`,
    // Sol yan kenar
    `L ${r2(fcx - frontWaistW / 2)} ${r2(frontWaistDip)}`,
    `Z`,
  ].join(" ");

  const frontPiece: PatternPiece = {
    name: "front_panel",
    label: "On Panel (x2)",
    svgPath: frontPath,
    points: [
      { x: fcx - frontWaistW / 2, y: frontWaistDip },
      { x: fcx + frontWaistW / 2, y: frontWaistDip },
      { x: frontW, y: frontCurveY },
      { x: fcx + tuskW, y: frontTotalH },
      { x: fcx, y: frontH * 0.82 },
      { x: fcx - tuskW, y: frontTotalH },
      { x: 0, y: frontCurveY },
    ],
    grainLine: { start: { x: fcx, y: 1 }, end: { x: fcx, y: frontH * 0.78 } },
    notches: [
      { x: frontW, y: frontCurveY },
      { x: 0, y: frontCurveY },
      { x: fcx, y: frontH * 0.82 },
    ],
    color: PIECE_COLORS.front_panel,
    width: r1(frontW),
    height: r1(frontTotalH),
    areaCm2: r1(estimateArea(frontW, frontTotalH, 0.48)),
    grainAngle: 0,
    seamType: "flatlock",
    offsetX: 0,
    offsetY: 0,
  };

  // ════════════ 3. YAN PANEL (×2 ayna cift) ════════════
  // Asimetrik yamuk — sol kenar (arka) daha uzun, sag kenar (on) daha kisa
  const sideW = hipCirc * SIDE_HIP * (1 + ease.hip) * shrinkX;
  const sideBackH = backH;
  const sideFrontH = totalH * shrinkY;
  const sideTopDiff = sideBackH - sideFrontH; // ~3.5cm (backRise)
  const sideH = sideBackH;

  const sidePath = [
    `M 0 0`,
    `L ${r2(sideW)} ${r2(sideTopDiff)}`,
    `L ${r2(sideW)} ${r2(sideH)}`,
    `L 0 ${r2(sideH)}`,
    `Z`,
  ].join(" ");

  const sidePiece: PatternPiece = {
    name: "side_panel",
    label: "Yan Panel (x2)",
    svgPath: sidePath,
    points: [
      { x: 0, y: 0 },
      { x: sideW, y: sideTopDiff },
      { x: sideW, y: sideH },
      { x: 0, y: sideH },
    ],
    grainLine: { start: { x: sideW / 2, y: sideTopDiff + 2 }, end: { x: sideW / 2, y: sideH - 2 } },
    notches: [
      { x: 0, y: sideH * 0.5 },
      { x: sideW, y: sideTopDiff + (sideH - sideTopDiff) * 0.5 },
    ],
    color: PIECE_COLORS.side_panel,
    width: r1(sideW),
    height: r1(sideH),
    areaCm2: r1(sideW * (sideH + sideFrontH) / 2),
    grainAngle: 0,
    seamType: "flatlock",
    offsetX: 0,
    offsetY: 0,
  };

  // ════════════ 4. IC PARCA / INSET (×2 ayna cift) ════════════
  // Damla/ucgen sekli — kasik koprusu
  // Sol kenar: duz dikey (uzun), alt: duz yatay, sag+ust: bezier egri (on panele dikilen)
  const insetH = totalH * INSET_H * shrinkY;
  const insetLegW = (pacaCirc / 2) * LEG_INSET * (1 + ease.leg) * shrinkX;
  const insetW = insetLegW;

  const insetPath = [
    `M 0 0`,
    `L 0 ${r2(insetH)}`,
    `L ${r2(insetW)} ${r2(insetH)}`,
    `L ${r2(insetW)} ${r2(insetH * 0.55)}`,
    `C ${r2(insetW)} ${r2(insetH * 0.28)}, ${r2(insetW * 0.65)} ${r2(insetH * 0.08)}, 0 0`,
    `Z`,
  ].join(" ");

  const insetPiece: PatternPiece = {
    name: "inset",
    label: "Ic Parca (x2)",
    svgPath: insetPath,
    points: [
      { x: 0, y: 0 },
      { x: 0, y: insetH },
      { x: insetW, y: insetH },
      { x: insetW, y: insetH * 0.55 },
    ],
    grainLine: { start: { x: insetW * 0.3, y: 2 }, end: { x: insetW * 0.3, y: insetH - 2 } },
    notches: [
      { x: 0, y: insetH * 0.5 },
      { x: insetW, y: insetH },
      { x: insetW, y: insetH * 0.55 },
    ],
    color: PIECE_COLORS.inset,
    width: r1(insetW),
    height: r1(insetH),
    areaCm2: r1(estimateArea(insetW, insetH, 0.45)),
    grainAngle: 0,
    seamType: "overlock",
    offsetX: 0,
    offsetY: 0,
  };

  const pieces = [backPiece, frontPiece, sidePiece, insetPiece];

  // Yerlesimleri hesapla — yan yana, 3cm bosluk
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
    patternHeight: totalH,
    backPanelWidth: r1(backW),
    backPanelHeight: r1(backH),
    frontPanelWidth: r1(frontW),
    frontPanelHeight: r1(frontTotalH),
    sidePanelWidth: r1(sideW),
    sidePanelHeight: r1(sideH),
    insetWidth: r1(insetW),
    insetHeight: r1(insetH),
    gussetWidth: r1(gussetW),
    elasticLengthCm,
    elasticWidthCm,
    legOpeningCirc: pacaCirc,
  };

  return { pieces, measurements };
}

// ─── KADIN KULOT — 3 PARCA ──────────────────────────────────

function generateFemalePantyPieces(
  size: SizeKey,
  options: PatternOptions = {},
  modelType: "bikini" | "hipster" = "bikini",
): { pieces: PatternPiece[]; measurements: Record<string, number> } {
  const sd = FEMALE_PANTY_SIZES[size];
  const ease = { ...EASE_PROFILES.FEMALE_PANTY, ...options.easeOverride };

  const waistCirc = sd.belCevresiCm;
  const hipCirc = sd.yarimGenCm * 4;

  // Hipster: dusuk bel hatti — kasik geometrisi ayni kalir
  const riseReduction = modelType === "hipster" ? 0.88 : 1.0;
  const patternH = sd.kalipBoyCm * riseReduction;

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
  const fpCrotchW = gussetW / 2; // kasik tabani = ag astari genisligine esit
  const fpWaistDip = 1.2;
  const fpHipY = fpHeight * 0.38;
  const fpHipHalfW = (hipCirc / 4 - 1) * (1 + ease.hip) * shrinkX;
  const fpCx = fpHipHalfW;
  const fpW = fpHipHalfW * 2;

  // V-kesim: Bacak acikligi yukari dogru V seklinde
  // V-kesim: Bikini yuksek kesim, Hipster daha genis bacak bandi
  const fpLegY = fpHeight * (modelType === "hipster" ? 0.60 : 0.65);

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
    areaCm2: r1(estimateArea(fpW, fpHeight, 0.58)),
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
  const bpCrotchW = gussetW / 2 * 1.1; // arka daha genis — oturma bolgesi
  const bpWaistDip = 1.8;
  const bpHipY = bpHeight * 0.33;
  const bpHipHalfW = (hipCirc / 4 + 1) * (1 + ease.hip) * shrinkX; // Oturma bolgesi — hipCirc/4 + 1cm
  const bpCx = bpHipHalfW;
  const bpW = bpHipHalfW * 2;
  const bpLegY = bpHeight * (modelType === "hipster" ? 0.55 : 0.60);

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
    areaCm2: r1(estimateArea(bpW, bpHeight, 0.55)),
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
    crotchWidth: r1(fpCrotchW * 2),
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

      // Trunk icin bacak boyunu kisalt
      // Bruce yapisinda: back_panel, side_panel ve inset bacak iceriyor
      // front_panel zaten kisa (bel-kasik arasi) — degistirme
      if (modelType === "trunk") {
        const heightReduction = 0.75;
        pattern.pieces = pattern.pieces.map((p) => {
          if (p.name === "back_panel" || p.name === "side_panel" || p.name === "inset") {
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
    case "bikini":
    case "hipster": {
      // Hipster parametreleri dogrudan uretilir (scalePathY yerine)
      const data = generateFemalePantyPieces(size, options, modelType);
      return buildPattern(modelType, "female", size, data, options);
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
  const inset = pattern.pieces.find((p) => p.name === "inset");
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

  // 2. Yan dikis / parca uyumu kontrolu
  if (pattern.gender === "male" && inset) {
    // Bruce yapisi: front kisa (bel-kasik), inset uzun (kasik-paca)
    // front.height + inset.height ≈ back.height
    const compositeHeight = front.height + inset.height;
    const heightDiff = Math.abs(compositeHeight - back.height);
    const ok = heightDiff <= 5;
    if (!ok) {
      warnings.push(
        `Parca uyumu: on(${front.height.toFixed(1)})+inset(${inset.height.toFixed(1)})=${compositeHeight.toFixed(1)}cm vs arka=${back.height.toFixed(1)}cm (fark: ${heightDiff.toFixed(1)}cm)`,
      );
    }
    checks.push({
      name: "Parca uyumu",
      passed: ok,
      message: `On+inset=${compositeHeight.toFixed(1)}cm, arka=${back.height.toFixed(1)}cm`,
      value: heightDiff,
    });
  } else if (pattern.gender === "female") {
    const frontSideLen = front.height;
    const backSideLen = back.height;
    const sideDiff = Math.abs(frontSideLen - backSideLen);
    const ok = sideDiff <= 5;
    if (!ok) {
      warnings.push(
        `Yan dikis farki: on=${frontSideLen.toFixed(1)}cm, arka=${backSideLen.toFixed(1)}cm`,
      );
    }
    checks.push({ name: "Yan dikis", passed: ok, message: `Fark: ${sideDiff.toFixed(1)}cm`, value: sideDiff });
  }

  // 3. Inset / Ag parcasi kontrolu
  if (inset) {
    const iW = inset.width;
    let iOk = true;
    if (iW < 3) {
      warnings.push(`Inset genisligi cok dar: ${iW.toFixed(1)}cm`);
      iOk = false;
    }
    if (iW > 15) {
      warnings.push(`Inset genisligi cok genis: ${iW.toFixed(1)}cm`);
      iOk = false;
    }
    checks.push({ name: "Inset parcasi", passed: iOk, message: `Genislik: ${iW.toFixed(1)}cm`, value: iW });
  } else if (gusset) {
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
    // Bel bandi yok — panel genislikleri ile kalca cevresi kontrolu
    // Bruce boxer: back + front + side×2 (front ×2 katmanli, sadece biri cevre ekler)
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

  // Cift kesilen parcalar — label'inda "(x2)" olanlar ayna cift kesilir
  // Katli kesim parcalar (arka panel, kadin on/arka) tekil kalir
  const mirrorArea = pattern.pieces.reduce((sum, p) => {
    if (p.label.includes("(x2)")) {
      return sum + p.areaCm2;
    }
    return sum;
  }, 0);

  // Toplam: tum parcalar + ayna parcalarin fazladan 1 kopyasi
  const finalCm2 = totalCm2 + mirrorArea * (1 + SHRINKAGE.lengthwise) * (1 + SHRINKAGE.crosswise);

  return finalCm2 / 10000; // m2'ye cevir
}
