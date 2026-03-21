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

/**
 * Üretim aşama süreleri — 2026 Mart piyasa araştırmasına dayalı
 *
 * Kaynaklar:
 * - Kumaş temin: Bursa örmecilerden 2-3 hafta (boyama dahil), stokta varsa 1 hafta
 * - Jakarlı lastik: 2-3 hafta (kalıp açılması gerekirse +1 hafta)
 * - Fason dikim: 1.000 adet parti 4-7 iş günü, 5.000+ adet 15-20 iş günü
 * - Kalite kontrol: End-line %100 kontrol 30-60 sn/adet + AQL örnekleme
 * - Etiketleme + paketleme: 1-2 dk/adet (ütü + katlama + etiket + polybag)
 */
export const PRODUCTION_STAGES: StageTime[] = [
  { name: "Sipariş Onay + BOM Hesaplama",  minDays: 0,  maxDays: 1,  avgDays: 0.5,  note: "Otomatik BOM, admin onayı" },
  { name: "Tedarikçi Sipariş Verme",       minDays: 1,  maxDays: 3,  avgDays: 2,    note: "Haftalık toplu sipariş, Pazartesi e-posta" },
  { name: "Kumaş Temin (Bursa Örmeci)",    minDays: 5,  maxDays: 15, avgDays: 10,   note: "Boyama dahil 2-3 hft, stokta 1 hft" },
  { name: "Aksesuar Temin (Lastik+Etiket)", minDays: 3,  maxDays: 10, avgDays: 7,    note: "Jakarlı lastik 2-3 hft, etiket 1 hft" },
  { name: "Malzeme Sevk + Teslim Alma",    minDays: 1,  maxDays: 2,  avgDays: 1.5,  note: "Bursa içi kargo/kurye" },
  { name: "Kesim (Serim + CNC/Dik Bıçak)", minDays: 0.5, maxDays: 2, avgDays: 1,    note: "60-80 kat serim, %10-15 fire" },
  { name: "Fason Dikim",                   minDays: 5,  maxDays: 20, avgDays: 10,   note: "Boxer 3-5 dk/adet, hat kapasitesi 800-1200/gün" },
  { name: "Kalite Kontrol (AQL 2.5)",      minDays: 1,  maxDays: 3,  avgDays: 1.5,  note: "End-line %100 + AQL örnekleme + metal dedektör" },
  { name: "Ütü + Katlama + Etiketleme",    minDays: 0.5, maxDays: 2, avgDays: 1,    note: "Buhar ütü, etiket takma, beden+yıkama+GTIN" },
  { name: "Paketleme + Kolileme",          minDays: 0.5, maxDays: 2, avgDays: 1,    note: "OPP poşet, kartela, koli hazırlama" },
  { name: "Kargo Sevkiyat (Bayiye/Depoya)", minDays: 1,  maxDays: 3, avgDays: 2,    note: "Geliver multi-carrier, 1-3 gün" },
];

// Toplam: min ~15.5, max ~63, ort ~37.5 iş günü (~6-10 hafta araştırma ile uyumlu)
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
 * Adet bazlı mod seçimi (araştırma verileriyle güncellenmiş):
 *   <100 adet   → min (numune/küçük parti, stoktan malzeme)
 *   100–1.000   → avg (standart üretim partisi)
 *   >1.000 adet → max (büyük parti, tam tedarik zinciri)
 *
 * Kaynak: Fason dikim süreleri lot büyüklüğüne göre:
 *   500-1.000 adet: 1-2 hafta
 *   1.000-3.000 adet: 2-3 hafta
 *   3.000-5.000 adet: 3-4 hafta
 *   5.000-10.000 adet: 4-6 hafta
 */
function getMode(totalQuantity: number): TerminMode {
  if (totalQuantity < 100) return "min";
  if (totalQuantity <= 1000) return "avg";
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
