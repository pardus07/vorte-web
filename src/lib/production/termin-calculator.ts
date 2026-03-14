/**
 * Vorte Tekstil — Termin Hesaplama Motoru
 *
 * Kaynak: vorte_uretim_planlama_v2.xlsx → "Termin Hesaplama" sayfası
 *
 * Formül: termin = siparisTarihi + (ortGün × 1.2 güvenlik marjı)
 * Adet bazlı:
 *   <50 adet  → Min süreler baz
 *   50–500    → Ort süreler baz
 *   >500 adet → Max süreler baz
 */

// ─── AŞAMA SÜRELERİ (İŞ GÜNÜ) ──────────────────────────────

interface StageTime {
  name: string;
  minDays: number;
  maxDays: number;
  avgDays: number;
  note: string;
}

export const PRODUCTION_STAGES: StageTime[] = [
  { name: "Sipariş Onay + BOM",       minDays: 0,  maxDays: 1,  avgDays: 0.5,  note: "Otonom" },
  { name: "Tedarikçi Sipariş Bekleme", minDays: 1,  maxDays: 3,  avgDays: 2,    note: "Haftalık toplu" },
  { name: "Malzeme Temin",            minDays: 3,  maxDays: 7,  avgDays: 5,    note: "Stok durumu" },
  { name: "Malzeme Sevk",             minDays: 1,  maxDays: 2,  avgDays: 1.5,  note: "Kargo" },
  { name: "Üretim (Fason)",           minDays: 5,  maxDays: 15, avgDays: 10,   note: "Kapasite bağlı" },
  { name: "Kalite Kontrol",           minDays: 1,  maxDays: 2,  avgDays: 1.5,  note: "AQL" },
  { name: "Paketleme",                minDays: 1,  maxDays: 2,  avgDays: 1.5,  note: "Etiket+ambalaj" },
  { name: "Kargo (Bayiye)",           minDays: 1,  maxDays: 3,  avgDays: 2,    note: "Geliver" },
];

// Toplam: min 13, max 35, ort 24 iş günü
export const SAFETY_MARGIN = 1.2; // %20 güvenlik marjı

// ─── TERMİN HESAPLAMA ──────────────────────────────────────

export type TerminMode = "min" | "avg" | "max";

export interface TerminResult {
  /** Seçilen hesaplama modu */
  mode: TerminMode;
  /** Toplam iş günü (güvenlik marjı dahil) */
  totalBusinessDays: number;
  /** Ham toplam iş günü (güvenlik marjı hariç) */
  rawBusinessDays: number;
  /** Tahmini teslim tarihi */
  estimatedDelivery: Date;
  /** Sipariş tarihi */
  orderDate: Date;
  /** Toplam adet */
  totalQuantity: number;
  /** Aşama bazlı detay */
  stages: { name: string; days: number; note: string }[];
}

/**
 * Adet bazlı mod seçimi:
 *   <50 adet  → min (en kısa süre)
 *   50–500    → avg (ortalama süre)
 *   >500      → max (en uzun süre)
 */
function getMode(totalQuantity: number): TerminMode {
  if (totalQuantity < 50) return "min";
  if (totalQuantity <= 500) return "avg";
  return "max";
}

/**
 * İş günü ekle (hafta sonlarını atla)
 */
function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    // 0 = Pazar, 6 = Cumartesi
    if (dow !== 0 && dow !== 6) {
      added++;
    }
  }
  return result;
}

/**
 * Ana termin hesaplama fonksiyonu
 *
 * @param totalQuantity Toplam üretim adedi
 * @param orderDate Sipariş tarihi (default: bugün)
 * @param forceMode İstege bağlı mod (min/avg/max) — belirtilmezse adet bazlı otomatik seçilir
 */
export function calculateTermin(
  totalQuantity: number,
  orderDate?: Date,
  forceMode?: TerminMode,
): TerminResult {
  const date = orderDate || new Date();
  const mode = forceMode || getMode(totalQuantity);

  const stages: { name: string; days: number; note: string }[] = [];
  let rawTotal = 0;

  for (const stage of PRODUCTION_STAGES) {
    let days: number;
    switch (mode) {
      case "min": days = stage.minDays; break;
      case "max": days = stage.maxDays; break;
      default:    days = stage.avgDays; break;
    }
    rawTotal += days;
    stages.push({
      name: stage.name,
      days: Math.round(days * 10) / 10,
      note: stage.note,
    });
  }

  // Güvenlik marjı uygula
  const totalBusinessDays = Math.ceil(rawTotal * SAFETY_MARGIN);

  // İş günü bazlı teslim tarihi hesapla
  const estimatedDelivery = addBusinessDays(date, totalBusinessDays);

  return {
    mode,
    totalBusinessDays,
    rawBusinessDays: rawTotal,
    estimatedDelivery,
    orderDate: date,
    totalQuantity,
    stages,
  };
}

/**
 * Termin tarihini Türkçe formatlı string olarak döndür
 */
export function formatTerminDate(date: Date): string {
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
