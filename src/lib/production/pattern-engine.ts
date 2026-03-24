/**
 * Vorte Tekstil — Parametrik Kalıp Hesaplama Motoru
 *
 * Saf TypeScript, UI bağımsız.
 * Beden verileri bom-calculator.ts'den alınır.
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
  points: Point[];
  grainLine: { start: Point; end: Point };
  notches: Point[];
  color: string;
  width: number;   // cm
  height: number;  // cm
  areaCm2: number;
}

export interface Pattern {
  modelType: ModelType;
  size: SizeKey;
  gender: "male" | "female";
  pieces: PatternPiece[];
  totalAreaCm2: number;
  totalAreaWithSeamCm2: number;
  fabricAreaM2: number;
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
}

export interface EaseProfile {
  waist: number;
  hip: number;
  leg: number;
  gusset: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── SABİTLER ───────────────────────────────────────────────

/** Bölgesel ease (bolluk) profilleri */
export const EASE_PROFILES: Record<string, EaseProfile> = {
  MALE_BOXER: { waist: 0.12, hip: 0.07, leg: 0.09, gusset: 0.01 },
  FEMALE_PANTY: { waist: 0.11, hip: 0.09, leg: 0.06, gusset: 0 },
};

/** Çekme payları (yıkama sonrası) */
export const SHRINKAGE = {
  lengthwise: 0.05,  // %5 boyuna çekme
  crosswise: 0.03,   // %3 enine çekme
} as const;

/** Dikiş payları (cm) */
export const SEAM_ALLOWANCES: Record<SeamType, number> = {
  flatlock: 0.35,
  overlock: 0.6,
  coverlock: 1.2,
  waistband: 3.0,
};

/** SVG renk paleti */
const PIECE_COLORS: Record<string, string> = {
  front_panel: "#3B82F6",   // mavi
  back_panel: "#22C55E",    // yeşil
  gusset: "#F97316",        // turuncu
  gusset_lining: "#F97316", // turuncu
  waistband: "#8B5CF6",     // mor
};

/** Grading tablosu — beden arası artışlar (cm) */
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

/** Dikdörtgen + yuvarlatılmış köşeler için kontrol noktaları */
function createRoundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 1.5,
): Point[] {
  const r = Math.min(radius, w / 2, h / 2);
  return [
    { x: x + r, y },
    { x: x + w - r, y },
    { x: x + w, y: y + r },
    { x: x + w, y: y + h - r },
    { x: x + w - r, y: y + h },
    { x: x + r, y: y + h },
    { x, y: y + h - r },
    { x, y: y + r },
  ];
}

/** Eğri ağ (kasık) çıkıntısı kontrol noktaları */
function createCrotchExtension(
  baseX: number,
  baseY: number,
  extensionWidth: number,
  extensionHeight: number,
  direction: "left" | "right" = "right",
): Point[] {
  const sign = direction === "right" ? 1 : -1;
  return [
    { x: baseX, y: baseY },
    { x: baseX + sign * extensionWidth * 0.3, y: baseY + extensionHeight * 0.2 },
    { x: baseX + sign * extensionWidth * 0.7, y: baseY + extensionHeight * 0.6 },
    { x: baseX + sign * extensionWidth, y: baseY + extensionHeight },
    { x: baseX + sign * extensionWidth, y: baseY + extensionHeight + 2 },
    { x: baseX + sign * extensionWidth * 0.5, y: baseY + extensionHeight + 3 },
  ];
}

function polygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

// ─── ERKEK BOXER KALIP HESABI ───────────────────────────────

function generateMaleBoxerPattern(
  size: SizeKey,
  options: PatternOptions = {},
): Pattern {
  const sizeData = MALE_BOXER_SIZES[size];
  const ease = { ...EASE_PROFILES.MALE_BOXER, ...options.easeOverride };

  // Temel ölçüler
  const hipCirc = sizeData.yarimGenCm * 4; // yarımGen x 2 = tam genişlik, x 2 = çevre
  const waistCirc = sizeData.belCevresiCm;
  const patternHeight = sizeData.kalipBoyCm;

  // Kalıp formülleri
  const frontPanelWidth = (hipCirc / 4) - 1;
  const backPanelWidth = (hipCirc / 4) + 1;
  const frontRise = patternHeight;
  const backRise = frontRise + 3.5;
  const frontCrotchExt = (hipCirc / 2) / 8;
  const backCrotchExt = (hipCirc / 2) / 8 + 3;
  const gussetWidth = 8;
  const gussetLength = frontRise * 0.6;

  // Bel bandı
  const waistbandWidth = waistCirc / 2 + 2; // yarım bel bandı + dikiş payı
  const waistbandHeight = 4; // 4cm bel bandı yüksekliği

  // Ease uygula
  const easedFrontW = frontPanelWidth * (1 + ease.hip);
  const easedBackW = backPanelWidth * (1 + ease.hip);

  // Çekme payı uygula
  const shrinkX = options.includeShrinkage ? (1 + SHRINKAGE.crosswise) : 1;
  const shrinkY = options.includeShrinkage ? (1 + SHRINKAGE.lengthwise) : 1;

  const finalFrontW = easedFrontW * shrinkX;
  const finalBackW = easedBackW * shrinkX;
  const finalFrontH = frontRise * shrinkY;
  const finalBackH = backRise * shrinkY;

  // Ön panel kontrol noktaları
  const frontPoints = createRoundedRect(0, 0, finalFrontW, finalFrontH, 2);
  const frontCrotchPoints = createCrotchExtension(
    finalFrontW * 0.7, finalFrontH, frontCrotchExt, frontCrotchExt * 0.8, "right",
  );

  // Arka panel kontrol noktaları
  const backPoints = createRoundedRect(0, 0, finalBackW, finalBackH, 2);
  const backCrotchPoints = createCrotchExtension(
    finalBackW * 0.7, finalBackH, backCrotchExt, backCrotchExt * 0.8, "right",
  );

  // Ağ parçası
  const gussetPoints = createRoundedRect(0, 0, gussetWidth, gussetLength, 1);

  // Bel bandı
  const waistbandPoints = createRoundedRect(0, 0, waistbandWidth, waistbandHeight, 0.5);

  // Parçaları oluştur
  const pieces: PatternPiece[] = [
    {
      name: "front_panel",
      label: "Ön Panel",
      points: [...frontPoints, ...frontCrotchPoints],
      grainLine: { start: { x: finalFrontW / 2, y: 2 }, end: { x: finalFrontW / 2, y: finalFrontH - 2 } },
      notches: [
        { x: 0, y: finalFrontH * 0.5 },
        { x: finalFrontW, y: finalFrontH * 0.5 },
        { x: finalFrontW * 0.5, y: 0 },
      ],
      color: PIECE_COLORS.front_panel,
      width: finalFrontW,
      height: finalFrontH,
      areaCm2: finalFrontW * finalFrontH + (frontCrotchExt * frontCrotchExt * 0.8 * 0.5),
    },
    {
      name: "back_panel",
      label: "Arka Panel",
      points: [...backPoints, ...backCrotchPoints],
      grainLine: { start: { x: finalBackW / 2, y: 2 }, end: { x: finalBackW / 2, y: finalBackH - 2 } },
      notches: [
        { x: 0, y: finalBackH * 0.5 },
        { x: finalBackW, y: finalBackH * 0.5 },
        { x: finalBackW * 0.5, y: 0 },
      ],
      color: PIECE_COLORS.back_panel,
      width: finalBackW,
      height: finalBackH,
      areaCm2: finalBackW * finalBackH + (backCrotchExt * backCrotchExt * 0.8 * 0.5),
    },
    {
      name: "gusset",
      label: "Ağ Parçası",
      points: gussetPoints,
      grainLine: { start: { x: gussetWidth / 2, y: 1 }, end: { x: gussetWidth / 2, y: gussetLength - 1 } },
      notches: [
        { x: 0, y: gussetLength / 2 },
        { x: gussetWidth, y: gussetLength / 2 },
      ],
      color: PIECE_COLORS.gusset,
      width: gussetWidth,
      height: gussetLength,
      areaCm2: gussetWidth * gussetLength,
    },
    {
      name: "waistband",
      label: "Bel Bandı",
      points: waistbandPoints,
      grainLine: { start: { x: 2, y: waistbandHeight / 2 }, end: { x: waistbandWidth - 2, y: waistbandHeight / 2 } },
      notches: [
        { x: waistbandWidth / 2, y: 0 },
        { x: waistbandWidth / 4, y: 0 },
        { x: (waistbandWidth * 3) / 4, y: 0 },
      ],
      color: PIECE_COLORS.waistband,
      width: waistbandWidth,
      height: waistbandHeight,
      areaCm2: waistbandWidth * waistbandHeight,
    },
  ];

  const totalAreaCm2 = pieces.reduce((sum, p) => sum + p.areaCm2, 0);

  // Dikiş payı ekle
  const defaultSeam = options.seamAllowance || "flatlock";
  const seamCm = SEAM_ALLOWANCES[defaultSeam];
  const totalAreaWithSeamCm2 = pieces.reduce((sum, p) => {
    const perimeter = 2 * (p.width + p.height);
    return sum + p.areaCm2 + perimeter * seamCm;
  }, 0);

  return {
    modelType: "boxer_brief",
    size,
    gender: "male",
    pieces,
    totalAreaCm2,
    totalAreaWithSeamCm2,
    fabricAreaM2: totalAreaWithSeamCm2 / 10000,
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

// ─── KADIN KÜLOT KALIP HESABI ───────────────────────────────

function generateFemalePantyPattern(
  size: SizeKey,
  options: PatternOptions = {},
): Pattern {
  const sizeData = FEMALE_PANTY_SIZES[size];
  const ease = { ...EASE_PROFILES.FEMALE_PANTY, ...options.easeOverride };

  const waistCirc = sizeData.belCevresiCm;
  const hipCirc = sizeData.yarimGenCm * 4;
  const patternHeight = sizeData.kalipBoyCm;

  // Kalıp formülleri
  const frontPanelWidth = (waistCirc / 4) * 0.9;
  const backPanelWidth = (waistCirc / 4) * 0.9 + 2;
  const hipLineWidth = (hipCirc * 0.8) / 4;
  const gussetWidth = 8;
  const gussetLength = 14;

  // Ease uygula
  const easedFrontW = frontPanelWidth * (1 + ease.hip);
  const easedBackW = backPanelWidth * (1 + ease.hip);

  // Çekme payı
  const shrinkX = options.includeShrinkage ? (1 + SHRINKAGE.crosswise) : 1;
  const shrinkY = options.includeShrinkage ? (1 + SHRINKAGE.lengthwise) : 1;

  const finalFrontW = easedFrontW * shrinkX;
  const finalBackW = easedBackW * shrinkX;
  const finalFrontH = patternHeight * shrinkY;
  const finalBackH = (patternHeight + 2) * shrinkY; // arka biraz daha uzun

  // Ön panel — taperli şekil (belden kalçaya genişleyen, kasığa daralan)
  const frontPoints: Point[] = [
    { x: (finalFrontW - finalFrontW * 0.8) / 2, y: 0 },
    { x: finalFrontW - (finalFrontW - finalFrontW * 0.8) / 2, y: 0 },
    { x: finalFrontW, y: finalFrontH * 0.4 },
    { x: finalFrontW * 0.8, y: finalFrontH * 0.8 },
    { x: finalFrontW * 0.55, y: finalFrontH },
    { x: finalFrontW * 0.45, y: finalFrontH },
    { x: finalFrontW * 0.2, y: finalFrontH * 0.8 },
    { x: 0, y: finalFrontH * 0.4 },
  ];

  // Arka panel
  const backPoints: Point[] = [
    { x: (finalBackW - finalBackW * 0.85) / 2, y: 0 },
    { x: finalBackW - (finalBackW - finalBackW * 0.85) / 2, y: 0 },
    { x: finalBackW, y: finalBackH * 0.4 },
    { x: finalBackW * 0.85, y: finalBackH * 0.75 },
    { x: finalBackW * 0.6, y: finalBackH },
    { x: finalBackW * 0.4, y: finalBackH },
    { x: finalBackW * 0.15, y: finalBackH * 0.75 },
    { x: 0, y: finalBackH * 0.4 },
  ];

  // Ağ astarı
  const gussetPoints = createRoundedRect(0, 0, gussetWidth, gussetLength, 1.5);

  const pieces: PatternPiece[] = [
    {
      name: "front_panel",
      label: "Ön Panel",
      points: frontPoints,
      grainLine: { start: { x: finalFrontW / 2, y: 2 }, end: { x: finalFrontW / 2, y: finalFrontH - 2 } },
      notches: [
        { x: 0, y: finalFrontH * 0.4 },
        { x: finalFrontW, y: finalFrontH * 0.4 },
        { x: finalFrontW / 2, y: 0 },
      ],
      color: PIECE_COLORS.front_panel,
      width: finalFrontW,
      height: finalFrontH,
      areaCm2: polygonArea(frontPoints),
    },
    {
      name: "back_panel",
      label: "Arka Panel",
      points: backPoints,
      grainLine: { start: { x: finalBackW / 2, y: 2 }, end: { x: finalBackW / 2, y: finalBackH - 2 } },
      notches: [
        { x: 0, y: finalBackH * 0.4 },
        { x: finalBackW, y: finalBackH * 0.4 },
        { x: finalBackW / 2, y: 0 },
      ],
      color: PIECE_COLORS.back_panel,
      width: finalBackW,
      height: finalBackH,
      areaCm2: polygonArea(backPoints),
    },
    {
      name: "gusset_lining",
      label: "Ağ Astarı",
      points: gussetPoints,
      grainLine: { start: { x: gussetWidth / 2, y: 1 }, end: { x: gussetWidth / 2, y: gussetLength - 1 } },
      notches: [
        { x: 0, y: gussetLength / 2 },
        { x: gussetWidth, y: gussetLength / 2 },
      ],
      color: PIECE_COLORS.gusset_lining,
      width: gussetWidth,
      height: gussetLength,
      areaCm2: gussetWidth * gussetLength,
    },
  ];

  const totalAreaCm2 = pieces.reduce((sum, p) => sum + p.areaCm2, 0);
  const defaultSeam = options.seamAllowance || "flatlock";
  const seamCm = SEAM_ALLOWANCES[defaultSeam];
  const totalAreaWithSeamCm2 = pieces.reduce((sum, p) => {
    const perimeter = 2 * (p.width + p.height);
    return sum + p.areaCm2 + perimeter * seamCm;
  }, 0);

  return {
    modelType: "bikini",
    size,
    gender: "female",
    pieces,
    totalAreaCm2,
    totalAreaWithSeamCm2,
    fabricAreaM2: totalAreaWithSeamCm2 / 10000,
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
 * Ana kalıp üretme fonksiyonu.
 * modelType'a göre uygun kalıp hesabını çağırır.
 */
export function generatePattern(
  modelType: ModelType,
  size: SizeKey,
  options: PatternOptions = {},
): Pattern {
  switch (modelType) {
    case "boxer_brief":
    case "trunk": {
      const pattern = generateMaleBoxerPattern(size, options);
      pattern.modelType = modelType;
      // Trunk için bacak boyunu kısalt
      if (modelType === "trunk") {
        pattern.pieces = pattern.pieces.map((p) => {
          if (p.name === "front_panel" || p.name === "back_panel") {
            const heightReduction = 0.75; // %25 kısaltma
            return {
              ...p,
              height: p.height * heightReduction,
              areaCm2: p.areaCm2 * heightReduction,
              points: p.points.map((pt) => ({ x: pt.x, y: pt.y * heightReduction })),
            };
          }
          return p;
        });
        pattern.totalAreaCm2 = pattern.pieces.reduce((s, p) => s + p.areaCm2, 0);
        pattern.totalAreaWithSeamCm2 = pattern.totalAreaCm2 * 1.05;
        pattern.fabricAreaM2 = pattern.totalAreaWithSeamCm2 / 10000;
      }
      return pattern;
    }
    case "bikini":
    case "hipster": {
      const pattern = generateFemalePantyPattern(size, options);
      pattern.modelType = modelType;
      // Hipster için bel hattını düşür (daha kısa boy)
      if (modelType === "hipster") {
        pattern.pieces = pattern.pieces.map((p) => {
          if (p.name === "front_panel" || p.name === "back_panel") {
            const heightReduction = 0.88; // bel hattı düşürme
            return {
              ...p,
              height: p.height * heightReduction,
              areaCm2: p.areaCm2 * heightReduction,
              points: p.points.map((pt) => ({ x: pt.x, y: pt.y * heightReduction })),
            };
          }
          return p;
        });
        pattern.totalAreaCm2 = pattern.pieces.reduce((s, p) => s + p.areaCm2, 0);
        pattern.totalAreaWithSeamCm2 = pattern.totalAreaCm2 * 1.05;
        pattern.fabricAreaM2 = pattern.totalAreaWithSeamCm2 / 10000;
      }
      return pattern;
    }
    default:
      throw new Error(`Bilinmeyen model tipi: ${modelType}`);
  }
}

/**
 * Beden grading — temel kalıptan hedef bedene ölçekleme.
 * Grading tablosuna göre artış/azalış uygular.
 */
export function gradePattern(basePattern: Pattern, targetSize: SizeKey): Pattern {
  const baseIdx = getSizeIndex(basePattern.size);
  const targetIdx = getSizeIndex(targetSize);

  if (baseIdx === targetIdx) return basePattern;

  // Adım adım grading uygula
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

  // Ölçek faktörleri hesapla
  const baseWaist = basePattern.metadata.waistCirc;
  const baseHip = basePattern.metadata.hipCirc;
  const scaleX = (baseHip + cumulativeHipDelta) / baseHip;
  const scaleY = 1 + (cumulativeWaistDelta / baseWaist) * 0.3; // boy ölçekleme daha yumuşak

  // Yeni kalıp oluştur — scale uygula
  const newPieces = basePattern.pieces.map((piece) => ({
    ...piece,
    width: piece.width * scaleX,
    height: piece.height * scaleY,
    areaCm2: piece.areaCm2 * scaleX * scaleY,
    points: piece.points.map((pt) => ({
      x: pt.x * scaleX,
      y: pt.y * scaleY,
    })),
    grainLine: {
      start: { x: piece.grainLine.start.x * scaleX, y: piece.grainLine.start.y * scaleY },
      end: { x: piece.grainLine.end.x * scaleX, y: piece.grainLine.end.y * scaleY },
    },
    notches: piece.notches.map((n) => ({
      x: n.x * scaleX,
      y: n.y * scaleY,
    })),
  }));

  const totalAreaCm2 = newPieces.reduce((s, p) => s + p.areaCm2, 0);

  return {
    ...basePattern,
    size: targetSize,
    pieces: newPieces,
    totalAreaCm2,
    totalAreaWithSeamCm2: totalAreaCm2 * 1.05,
    fabricAreaM2: (totalAreaCm2 * 1.05) / 10000,
    metadata: {
      ...basePattern.metadata,
      waistCirc: baseWaist + cumulativeWaistDelta,
      hipCirc: baseHip + cumulativeHipDelta,
    },
  };
}

/**
 * Kalıp doğrulama — çevre eşleştirme ve uyumluluk kontrolleri.
 */
export function validatePattern(pattern: Pattern): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const front = pattern.pieces.find((p) => p.name === "front_panel");
  const back = pattern.pieces.find((p) => p.name === "back_panel");
  const gusset = pattern.pieces.find((p) =>
    p.name === "gusset" || p.name === "gusset_lining",
  );

  if (!front || !back) {
    errors.push("Ön ve arka panel bulunamadı.");
    return { valid: false, errors, warnings };
  }

  // 1. Yan dikiş uzunluğu kontrolü (+-2mm tolerans)
  const sideTolerance = 0.2; // cm
  const frontSideLength = front.height;
  const backSideLength = back.height;
  const sideDiff = Math.abs(frontSideLength - backSideLength);

  if (pattern.gender === "male" && pattern.modelType !== "trunk") {
    // Boxer: arka rise daha uzun, bu normal — sadece cok buyuk fark uyar
    if (sideDiff > 5) {
      errors.push(
        `Yan dikiş farkı çok büyük: ön=${frontSideLength.toFixed(1)}cm, arka=${backSideLength.toFixed(1)}cm (fark: ${sideDiff.toFixed(1)}cm)`,
      );
    }
  } else if (pattern.gender === "female") {
    if (sideDiff > sideTolerance + 3) {
      warnings.push(
        `Yan dikiş farkı: ön=${frontSideLength.toFixed(1)}cm, arka=${backSideLength.toFixed(1)}cm`,
      );
    }
  }

  // 2. Ağ parçası ön kenar kontrolü
  if (gusset) {
    const gussetFrontEdge = gusset.width;
    if (gussetFrontEdge < 5) {
      warnings.push(`Ağ genişliği çok dar: ${gussetFrontEdge.toFixed(1)}cm`);
    }
    if (gussetFrontEdge > 12) {
      warnings.push(`Ağ genişliği çok geniş: ${gussetFrontEdge.toFixed(1)}cm`);
    }
  }

  // 3. Bel çevresi kontrolü
  const easeWaist = pattern.gender === "male"
    ? EASE_PROFILES.MALE_BOXER.waist
    : EASE_PROFILES.FEMALE_PANTY.waist;

  const expectedWaist = pattern.metadata.waistCirc * (1 + easeWaist);
  const calculatedWaist = (front.width + back.width) * 2;
  const waistDiffPercent = Math.abs(calculatedWaist - expectedWaist) / expectedWaist;

  if (waistDiffPercent > 0.15) {
    warnings.push(
      `Bel çevresi uyumsuzluğu: hesaplanan=${calculatedWaist.toFixed(1)}cm, beklenen=${expectedWaist.toFixed(1)}cm (fark: ${(waistDiffPercent * 100).toFixed(1)}%)`,
    );
  }

  // 4. Alan kontrolü — aşırı küçük veya büyük
  if (pattern.totalAreaCm2 < 200) {
    errors.push(`Toplam alan çok küçük: ${pattern.totalAreaCm2.toFixed(0)}cm2`);
  }
  if (pattern.totalAreaCm2 > 5000) {
    errors.push(`Toplam alan çok büyük: ${pattern.totalAreaCm2.toFixed(0)}cm2`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Kalıp parçalarından SVG string üretir.
 * @param pattern - Kalıp verisi
 * @param scale - 1cm = kaç px (varsayılan 5)
 */
export function patternToSVG(pattern: Pattern, scale: number = 5): string {
  const padding = 20;
  let offsetX = padding;
  const offsetY = padding;

  // Toplam genişlik ve yükseklik hesapla
  let totalWidth = padding;
  let maxHeight = 0;

  for (const piece of pattern.pieces) {
    totalWidth += piece.width * scale + padding;
    maxHeight = Math.max(maxHeight, piece.height * scale);
  }

  const svgWidth = totalWidth + padding;
  const svgHeight = maxHeight + padding * 2 + 30;

  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">`,
  );

  // Arka plan
  parts.push(`  <rect width="${svgWidth}" height="${svgHeight}" fill="#FAFAFA" />`);

  // Başlık
  const genderLabel = pattern.gender === "male" ? "Erkek" : "Kadın";
  parts.push(
    `  <text x="${svgWidth / 2}" y="16" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#374151">${pattern.modelType.toUpperCase()} - ${pattern.size} - ${genderLabel}</text>`,
  );

  // Her parça için SVG oluştur
  for (const piece of pattern.pieces) {
    const pxW = piece.width * scale;
    const pxH = piece.height * scale;

    parts.push(`  <g transform="translate(${offsetX}, ${offsetY + 20})">`);

    // Path oluştur
    if (piece.points.length > 0) {
      const pathPoints = piece.points.map(
        (pt) => `${((pt.x / piece.width) * pxW).toFixed(1)},${((pt.y / piece.height) * pxH).toFixed(1)}`,
      );
      const pathD = `M ${pathPoints[0]} ` + pathPoints.slice(1).map((p) => `L ${p}`).join(" ") + " Z";

      parts.push(
        `    <path d="${pathD}" fill="${piece.color}20" stroke="${piece.color}" stroke-width="1.5" />`,
      );
    }

    // Grain line (kesikli çizgi)
    const glStart = piece.grainLine.start;
    const glEnd = piece.grainLine.end;
    const glX1 = ((glStart.x / piece.width) * pxW).toFixed(1);
    const glY1 = ((glStart.y / piece.height) * pxH).toFixed(1);
    const glX2 = ((glEnd.x / piece.width) * pxW).toFixed(1);
    const glY2 = ((glEnd.y / piece.height) * pxH).toFixed(1);
    parts.push(
      `    <line x1="${glX1}" y1="${glY1}" x2="${glX2}" y2="${glY2}" stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="4,3" />`,
    );

    // Grain line ok ucu
    const glEndPxX = (glEnd.x / piece.width) * pxW;
    const glEndPxY = (glEnd.y / piece.height) * pxH;
    parts.push(
      `    <polygon points="${(glEndPxX - 3).toFixed(1)},${(glEndPxY - 6).toFixed(1)} ${(glEndPxX + 3).toFixed(1)},${(glEndPxY - 6).toFixed(1)} ${glEndPxX.toFixed(1)},${glEndPxY.toFixed(1)}" fill="#94A3B8" />`,
    );

    // Notch (çentik) noktaları — küçük üçgenler
    for (const notch of piece.notches) {
      const nx = (notch.x / piece.width) * pxW;
      const ny = (notch.y / piece.height) * pxH;
      parts.push(
        `    <polygon points="${(nx - 2).toFixed(1)},${ny.toFixed(1)} ${(nx + 2).toFixed(1)},${ny.toFixed(1)} ${nx.toFixed(1)},${(ny + 4).toFixed(1)}" fill="${piece.color}" />`,
      );
    }

    // Parça etiketi
    parts.push(
      `    <text x="${(pxW / 2).toFixed(1)}" y="${(pxH + 14).toFixed(1)}" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#6B7280">${piece.label} (${piece.width.toFixed(1)}x${piece.height.toFixed(1)}cm)</text>`,
    );

    parts.push(`  </g>`);

    offsetX += pxW + padding;
  }

  parts.push(`</svg>`);

  return parts.join("\n");
}

/**
 * Gerçek kumaş alanı hesabı — dikiş payı, ease, çekme payı dahil.
 * m2 cinsinden döner.
 */
export function calculateRealFabricArea(pattern: Pattern): number {
  let totalCm2 = 0;

  for (const piece of pattern.pieces) {
    let area = piece.areaCm2;

    // Dikiş payı ekle (çevre x dikiş payı genişliği)
    const perimeter = 2 * (piece.width + piece.height);
    const seamType = (pattern.metadata.seamType.side || "flatlock") as SeamType;
    area += perimeter * SEAM_ALLOWANCES[seamType];

    // Çekme payı ekle
    area *= (1 + SHRINKAGE.lengthwise) * (1 + SHRINKAGE.crosswise);

    totalCm2 += area;
  }

  // Simetrik parçalar (ön/arka panel) 2 adet kesilir — ağ ve bel bandı tekil
  const symmetricArea = pattern.pieces.reduce((sum, p) => {
    if (p.name === "gusset" || p.name === "gusset_lining" || p.name === "waistband") {
      return sum; // tekil parçalar
    }
    return sum + p.areaCm2;
  }, 0);

  // Toplam: tüm parçalar + simetrik parçaların fazladan 1 kopyası
  const finalCm2 = totalCm2 + symmetricArea * (1 + SHRINKAGE.lengthwise) * (1 + SHRINKAGE.crosswise);

  return finalCm2 / 10000; // m2'ye çevir
}
