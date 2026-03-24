/**
 * Vorte Tekstil — Model Şablonları
 *
 * Her ürün modeli için kalıp parametreleri, dikiş tipleri ve parça tanımları.
 * pattern-engine.ts ile birlikte kullanılır.
 */

import {
  EASE_PROFILES,
  type ModelType,
  type SeamType,
  type EaseProfile,
} from "./pattern-engine";

// ─── TYPES ──────────────────────────────────────────────────

export type WaistbandType = "enclosed" | "foldover" | "elastic_only";
export type LegLength = "short" | "mid" | "long";
export type WaistHeight = "high" | "mid" | "low" | "very_low";

export interface PatternTemplate {
  name: string;
  nameTR: string;           // Türkçe etiket
  gender: "male" | "female";
  pieces: string[];
  ease: EaseProfile;
  seamTypes: {
    side: SeamType;
    crotch: SeamType;
    waist: SeamType;
    leg: SeamType;
  };
  waistbandType: WaistbandType;
  legLength?: LegLength;
  waistHeight?: WaistHeight;
  description: string;
  descriptionTR: string;    // Türkçe açıklama
}

// ─── MODEL ŞABLONLARI ──────────────────────────────────────

export const PATTERN_TEMPLATES: Record<ModelType, PatternTemplate> = {
  boxer_brief: {
    name: "Boxer Brief",
    nameTR: "Boxer Külot",
    gender: "male",
    pieces: ["front_panel", "back_panel", "side_panel", "gusset", "waistband"],
    ease: EASE_PROFILES.MALE_BOXER,
    seamTypes: {
      side: "flatlock",
      crotch: "overlock",
      waist: "coverlock",
      leg: "coverlock",
    },
    waistbandType: "enclosed",   // kaplanmış lastik
    legLength: "mid",            // mid-thigh
    description: "Classic boxer brief with mid-thigh length and enclosed waistband",
    descriptionTR: "Klasik boxer külot, orta uyluk boyu, kaplanmış lastikli bel",
  },

  trunk: {
    name: "Trunk",
    nameTR: "Trunk",
    gender: "male",
    pieces: ["front_panel", "back_panel", "side_panel", "gusset", "waistband"],
    ease: EASE_PROFILES.MALE_BOXER,
    seamTypes: {
      side: "flatlock",
      crotch: "overlock",
      waist: "coverlock",
      leg: "coverlock",
    },
    waistbandType: "enclosed",
    legLength: "short",          // bacak boyu kısa
    description: "Short-leg trunk with enclosed waistband",
    descriptionTR: "Kısa bacak trunk, kaplanmış lastikli bel",
  },

  bikini: {
    name: "Bikini",
    nameTR: "Bikini Külot",
    gender: "female",
    pieces: ["front_panel", "back_panel", "gusset_lining"],
    ease: EASE_PROFILES.FEMALE_PANTY,
    seamTypes: {
      side: "flatlock",
      crotch: "overlock",
      waist: "coverlock",
      leg: "coverlock",
    },
    waistbandType: "foldover",   // katlama bel
    waistHeight: "low",
    description: "Low-rise bikini panty with foldover waistband",
    descriptionTR: "Düşük bel bikini külot, katlamalı bel",
  },

  hipster: {
    name: "Hipster",
    nameTR: "Hipster Külot",
    gender: "female",
    pieces: ["front_panel", "back_panel", "gusset_lining"],
    ease: EASE_PROFILES.FEMALE_PANTY,
    seamTypes: {
      side: "flatlock",
      crotch: "overlock",
      waist: "coverlock",
      leg: "coverlock",
    },
    waistbandType: "foldover",
    waistHeight: "very_low",
    description: "Very low-rise hipster panty with foldover waistband",
    descriptionTR: "Çok düşük bel hipster külot, katlamalı bel",
  },
};

// ─── TÜRKÇE ETİKET HARİTASI ────────────────────────────────

/** Parça adı -> Türkçe etiket */
export const PIECE_LABELS_TR: Record<string, string> = {
  front_panel: "Ön Panel",
  back_panel: "Arka Panel",
  side_panel: "Yan Panel",
  gusset: "Ağ Parçası",
  gusset_lining: "Ağ Astarı",
  waistband: "Bel Bandı",
};

/** Model adı -> Türkçe etiket */
export const MODEL_LABELS_TR: Record<ModelType, string> = {
  boxer_brief: "Boxer Külot",
  trunk: "Trunk",
  bikini: "Bikini Külot",
  hipster: "Hipster Külot",
};

/** Dikiş tipi -> Türkçe etiket */
export const SEAM_LABELS_TR: Record<SeamType, string> = {
  flatlock: "Düz Dikiş (Flatlock)",
  overlock: "Overlok",
  coverlock: "Reçme (Coverlock)",
  waistband: "Bel Bandı Dikişi",
};

/** Bel bandı tipi -> Türkçe etiket */
export const WAISTBAND_LABELS_TR: Record<WaistbandType, string> = {
  enclosed: "Kaplanmış Lastik",
  foldover: "Katlamalı Bel",
  elastic_only: "Açık Lastik",
};

/** Bacak boyu -> Türkçe etiket */
export const LEG_LENGTH_LABELS_TR: Record<LegLength, string> = {
  short: "Kısa",
  mid: "Orta",
  long: "Uzun",
};

/** Bel yüksekliği -> Türkçe etiket */
export const WAIST_HEIGHT_LABELS_TR: Record<WaistHeight, string> = {
  high: "Yüksek Bel",
  mid: "Orta Bel",
  low: "Düşük Bel",
  very_low: "Çok Düşük Bel",
};

// ─── YARDIMCI FONKSİYONLAR ─────────────────────────────────

/** Model tipine göre şablon getir */
export function getTemplate(modelType: ModelType): PatternTemplate {
  const template = PATTERN_TEMPLATES[modelType];
  if (!template) {
    throw new Error(`Bilinmeyen model tipi: ${modelType}`);
  }
  return template;
}

/** Cinsiyete göre kullanılabilir şablonları listele */
export function getTemplatesByGender(gender: "male" | "female"): PatternTemplate[] {
  return Object.values(PATTERN_TEMPLATES).filter((t) => t.gender === gender);
}

/** Tüm şablonları Türkçe etiketleriyle listele */
export function listTemplatesWithLabels(): Array<{
  modelType: ModelType;
  name: string;
  nameTR: string;
  gender: "male" | "female";
  descriptionTR: string;
}> {
  return (Object.entries(PATTERN_TEMPLATES) as [ModelType, PatternTemplate][]).map(
    ([key, template]) => ({
      modelType: key,
      name: template.name,
      nameTR: template.nameTR,
      gender: template.gender,
      descriptionTR: template.descriptionTR,
    }),
  );
}
