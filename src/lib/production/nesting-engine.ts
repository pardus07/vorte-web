/**
 * Vorte Nesting Engine — SVGnest-tarzı marker planlama
 * Web Worker ile tarayıcıda çalışır, sunucu yükü sıfır.
 */

// ─── Tip Tanımları ──────────────────────────────────────

export interface NestingPiece {
  id: string;
  name: string;           // "front_panel_M", "back_panel_S"
  width: number;          // cm
  height: number;         // cm
  quantity: number;
  allowedRotations: number[]; // [0, 180] grain line kısıtı
}

export interface NestingConfig {
  fabricWidth: number;        // cm (150 veya 180)
  spacing: number;            // mm (varsayılan 5 — dik bıçak)
  populationSize: number;     // GA popülasyon (varsayılan 10)
  mutationRate: number;       // GA mutasyon oranı (varsayılan 15)
  timeLimit: number;          // ms (varsayılan 30000 = 30sn)
}

export interface NestingPlacement {
  pieceId: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
}

export interface NestingOutput {
  placements: NestingPlacement[];
  markerLength: number;
  efficiency: number;
  wasteArea: number;
  iterations: number;
}

export interface MarkerPlan {
  sizeCombo: string;
  markerLength: number;
  efficiency: number;
  fabricPerMarker: number;
  layCount: number;
  markerRepeats: number;
  totalFabricM2: number;
  totalFabricKg: number;
  placements: NestingPlacement[];
}

// ─── Worker Mesaj Tipleri ───────────────────────────────

export type WorkerMessage =
  | { type: "start"; pieces: NestingPiece[]; config: NestingConfig }
  | { type: "cancel" };

export type WorkerResponse =
  | { type: "progress"; efficiency: number; iteration: number; markerLength: number }
  | { type: "complete"; result: NestingOutput }
  | { type: "error"; message: string };

// ─── Varsayılan Config ──────────────────────────────────

export const DEFAULT_NESTING_CONFIG: NestingConfig = {
  fabricWidth: 150,
  spacing: 5,
  populationSize: 10,
  mutationRate: 15,
  timeLimit: 30000,
};

// ─── Buffer Değerleri (kesim yöntemine göre) ────────────

export const CUTTING_BUFFERS: Record<string, number> = {
  straightKnife: 5,   // mm
  automatic: 2,       // mm
  rotary: 3,          // mm
  laser: 1,           // mm
};

// ─── Max Serim Kat Sayıları (gramaja göre) ──────────────

export function getMaxLayCount(fabricGSM: number): number {
  if (fabricGSM <= 140) return 120;
  if (fabricGSM <= 170) return 100;
  if (fabricGSM <= 200) return 80;
  return 60;
}

// ─── Multi-size Marker Optimizasyonu ────────────────────

export function optimizeMarkerCombination(
  orderQuantities: Record<string, number>,
  fabricGSM: number,
  maxLayCount?: number
): { markers: { sizeCombo: string; layCount: number; repeats: number }[]; totalPieces: number } {
  const maxLay = maxLayCount || getMaxLayCount(fabricGSM);
  const markers: { sizeCombo: string; layCount: number; repeats: number }[] = [];
  const remaining = { ...orderQuantities };

  // Büyük-küçük eşleştirme stratejisi
  const pairs: [string, string][] = [
    ["S", "XXL"],
    ["S", "XL"],
    ["M", "L"],
  ];

  for (const [small, big] of pairs) {
    const smallQty = remaining[small] || 0;
    const bigQty = remaining[big] || 0;
    if (smallQty > 0 && bigQty > 0) {
      const qty = Math.min(smallQty, bigQty);
      const layCount = Math.min(maxLay, qty);
      const repeats = Math.ceil(qty / layCount);
      markers.push({ sizeCombo: `${small}+${big}`, layCount, repeats });
      remaining[small] = (remaining[small] || 0) - qty;
      remaining[big] = (remaining[big] || 0) - qty;
    }
  }

  // Kalan tek bedenler
  for (const [size, qty] of Object.entries(remaining)) {
    if (qty > 0) {
      const layCount = Math.min(maxLay, qty);
      const repeats = Math.ceil(qty / layCount);
      markers.push({ sizeCombo: size, layCount, repeats });
    }
  }

  const totalPieces = Object.values(orderQuantities).reduce((a, b) => a + b, 0);
  return { markers, totalPieces };
}

// ─── Kumaş Tüketimi Hesaplama ───────────────────────────

export function calculateFabricConsumption(
  markerLength: number,
  fabricWidth: number,
  layCount: number,
  markerRepeats: number,
  fabricGSM: number
): { totalM2: number; totalKg: number } {
  const markerAreaM2 = (markerLength / 100) * (fabricWidth / 100);
  const totalM2 = markerAreaM2 * markerRepeats * layCount;
  const totalKg = totalM2 * fabricGSM / 1000;
  return { totalM2: Math.round(totalM2 * 100) / 100, totalKg: Math.round(totalKg * 100) / 100 };
}

// ─── Web Worker Başlatma ────────────────────────────────

export function startNestingWorker(
  pieces: NestingPiece[],
  config: NestingConfig,
  onProgress?: (efficiency: number, iteration: number) => void
): { promise: Promise<NestingOutput>; cancel: () => void } {
  let worker: Worker | null = null;
  let cancelled = false;

  const promise = new Promise<NestingOutput>((resolve, reject) => {
    try {
      worker = new Worker("/workers/nesting-worker.js");

      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        if (cancelled) return;

        if (e.data.type === "progress" && onProgress) {
          onProgress(e.data.efficiency, e.data.iteration);
        } else if (e.data.type === "complete") {
          resolve(e.data.result);
          worker?.terminate();
        } else if (e.data.type === "error") {
          reject(new Error(e.data.message));
          worker?.terminate();
        }
      };

      worker.onerror = (err) => {
        reject(new Error(`Worker hatası: ${err.message}`));
        worker?.terminate();
      };

      worker.postMessage({ type: "start", pieces, config });
    } catch (err) {
      reject(err);
    }
  });

  const cancel = () => {
    cancelled = true;
    worker?.postMessage({ type: "cancel" });
    worker?.terminate();
  };

  return { promise, cancel };
}
