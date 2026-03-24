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
  svgPath?: string;       // Gerçek Bezier SVG path (pattern-engine'den)
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
  svgPath?: string;       // Gerçek Bezier SVG path (render için)
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

/** Inline worker blob URL — standalone deploy'da /public serve edilmez */
let cachedWorkerUrl: string | null = null;

function getWorkerUrl(): string {
  if (cachedWorkerUrl) return cachedWorkerUrl;
  const blob = new Blob([NESTING_WORKER_CODE], { type: "application/javascript" });
  cachedWorkerUrl = URL.createObjectURL(blob);
  return cachedWorkerUrl;
}

export function startNestingWorker(
  pieces: NestingPiece[],
  config: NestingConfig,
  onProgress?: (efficiency: number, iteration: number) => void
): { promise: Promise<NestingOutput>; cancel: () => void } {
  let worker: Worker | null = null;
  let cancelled = false;

  const promise = new Promise<NestingOutput>((resolve, reject) => {
    try {
      worker = new Worker(getWorkerUrl());

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

// ─── Inline Worker Kodu ──────────────────────────────────
// public/workers/nesting-worker.js ile senkronize tutulmalı.
// Standalone deploy (Docker/Coolify) uyumluluğu için inline.

const NESTING_WORKER_CODE = `
"use strict";
let cancelled = false;

self.onmessage = function (e) {
  if (e.data.type === "cancel") { cancelled = true; return; }
  if (e.data.type === "start") { cancelled = false; runNesting(e.data.pieces, e.data.config); }
};

function runNesting(pieces, config) {
  const fabricWidth = config.fabricWidth;
  const spacing = (config.spacing || 5) / 10;
  const timeLimit = config.timeLimit || 30000;
  const populationSize = config.populationSize || 10;
  const mutationRate = (config.mutationRate || 15) / 100;

  const expandedPieces = [];
  for (const piece of pieces) {
    for (let q = 0; q < (piece.quantity || 1); q++) {
      expandedPieces.push({
        id: piece.id + (piece.quantity > 1 ? "_" + q : ""),
        origId: piece.id,
        width: piece.width,
        height: piece.height,
        allowedRotations: piece.allowedRotations || [0, 180],
        svgPath: piece.svgPath || "",
      });
    }
  }

  if (expandedPieces.length === 0) {
    self.postMessage({ type: "complete", result: { placements: [], markerLength: 0, efficiency: 0, wasteArea: 0, iterations: 0 } });
    return;
  }

  const totalPieceArea = expandedPieces.reduce(function(sum, p) { return sum + p.width * p.height; }, 0);

  function placeBLF(order, rotations) {
    const skyline = new Float64Array(Math.ceil(fabricWidth / 0.5)).fill(0);
    const placements = [];

    for (let i = 0; i < order.length; i++) {
      const piece = expandedPieces[order[i]];
      const rot = rotations[i];
      const w = (rot === 90 || rot === 270) ? piece.height : piece.width;
      const h = (rot === 90 || rot === 270) ? piece.width : piece.height;
      const pw = w + spacing;
      const ph = h + spacing;

      let bestX = -1;
      let bestY = Infinity;
      const gridW = Math.ceil(pw / 0.5);
      const maxStartIdx = skyline.length - gridW;

      for (let sx = 0; sx <= maxStartIdx; sx++) {
        let maxH = 0;
        for (let dx = 0; dx < gridW; dx++) {
          if (skyline[sx + dx] > maxH) maxH = skyline[sx + dx];
        }
        if (maxH < bestY) { bestY = maxH; bestX = sx; }
      }

      if (bestX < 0) continue;

      placements.push({
        pieceId: piece.id,
        x: Math.round(bestX * 0.5 * 100) / 100,
        y: Math.round(bestY * 100) / 100,
        rotation: rot,
        width: Math.round(w * 100) / 100,
        height: Math.round(h * 100) / 100,
        svgPath: piece.svgPath || "",
      });

      for (let dx = 0; dx < gridW && (bestX + dx) < skyline.length; dx++) {
        skyline[bestX + dx] = bestY + ph;
      }
    }

    let markerLength = 0;
    for (let i = 0; i < skyline.length; i++) {
      if (skyline[i] > markerLength) markerLength = skyline[i];
    }

    const markerArea = markerLength * fabricWidth;
    const efficiency = markerArea > 0 ? (totalPieceArea / markerArea) * 100 : 0;
    return {
      placements: placements,
      markerLength: Math.round(markerLength * 100) / 100,
      efficiency: Math.round(efficiency * 100) / 100,
      wasteArea: Math.round((markerArea - totalPieceArea) * 100) / 100,
    };
  }

  const n = expandedPieces.length;
  const initialOrder = Array.from({ length: n }, function(_, i) { return i; });
  initialOrder.sort(function(a, b) {
    return (expandedPieces[b].width * expandedPieces[b].height) - (expandedPieces[a].width * expandedPieces[a].height);
  });

  function randomRotation(piece) {
    var rots = piece.allowedRotations;
    return rots[Math.floor(Math.random() * rots.length)];
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function tournament(pop, size) {
    var best = null;
    for (var i = 0; i < size; i++) {
      var c = pop[Math.floor(Math.random() * pop.length)];
      if (!best || c.efficiency > best.efficiency) best = c;
    }
    return best;
  }

  function orderCrossover(p1, p2) {
    var len = p1.length;
    var start = Math.floor(Math.random() * len);
    var end = start + Math.floor(Math.random() * (len - start));
    var child = new Array(len).fill(-1);
    for (var i = start; i <= end; i++) child[i] = p1[i];
    var pos = (end + 1) % len;
    for (var i2 = 0; i2 < len; i2++) {
      var idx = (end + 1 + i2) % len;
      var val = p2[idx];
      if (child.indexOf(val) === -1) { child[pos] = val; pos = (pos + 1) % len; }
    }
    return child;
  }

  var population = [];
  for (var p = 0; p < populationSize; p++) {
    var order = p === 0 ? initialOrder.slice() : shuffle(initialOrder.slice());
    var rotations = expandedPieces.map(function(piece) { return randomRotation(piece); });
    var result = placeBLF(order, rotations);
    result.order = order;
    result.rotations = rotations;
    population.push(result);
  }
  population.sort(function(a, b) { return b.efficiency - a.efficiency; });

  var bestResult = population[0];
  var iteration = 0;
  var startTime = Date.now();
  var lastProgressTime = 0;

  while (Date.now() - startTime < timeLimit && !cancelled) {
    iteration++;
    var newPop = [population[0]];

    while (newPop.length < populationSize) {
      var parent1 = tournament(population, 3);
      var parent2 = tournament(population, 3);
      var childOrder = orderCrossover(parent1.order, parent2.order);
      var childRot = parent1.rotations.slice();

      if (Math.random() < mutationRate) {
        var i1 = Math.floor(Math.random() * n);
        var j1 = Math.floor(Math.random() * n);
        var tmp1 = childOrder[i1]; childOrder[i1] = childOrder[j1]; childOrder[j1] = tmp1;
        var tmp2 = childRot[i1]; childRot[i1] = childRot[j1]; childRot[j1] = tmp2;
      }
      if (Math.random() < mutationRate) {
        var ri = Math.floor(Math.random() * n);
        childRot[ri] = randomRotation(expandedPieces[childOrder[ri]]);
      }

      var res = placeBLF(childOrder, childRot);
      res.order = childOrder;
      res.rotations = childRot;
      newPop.push(res);
    }

    newPop.sort(function(a, b) { return b.efficiency - a.efficiency; });
    population = newPop;
    if (population[0].efficiency > bestResult.efficiency) bestResult = population[0];

    var now = Date.now();
    if (now - lastProgressTime > 1000) {
      lastProgressTime = now;
      self.postMessage({ type: "progress", efficiency: bestResult.efficiency, iteration: iteration, markerLength: bestResult.markerLength });
    }
  }

  self.postMessage({
    type: "complete",
    result: {
      placements: bestResult.placements,
      markerLength: bestResult.markerLength,
      efficiency: bestResult.efficiency,
      wasteArea: bestResult.wasteArea,
      iterations: iteration,
    },
  });
}
`;
