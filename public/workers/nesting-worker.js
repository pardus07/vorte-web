/**
 * Vorte Nesting Web Worker
 * BLF (Bottom-Left Fill) + Genetik Algoritma ile dikdörtgen nesting
 * İç giyim parçaları yaklaşık dikdörtgen olduğu için %80-90 verimlilik sağlar
 */

let cancelled = false;

self.onmessage = function (e) {
  if (e.data.type === "cancel") {
    cancelled = true;
    return;
  }

  if (e.data.type === "start") {
    cancelled = false;
    const { pieces, config } = e.data;
    runNesting(pieces, config);
  }
};

function runNesting(pieces, config) {
  const fabricWidth = config.fabricWidth; // cm
  const spacing = (config.spacing || 5) / 10; // mm → cm
  const timeLimit = config.timeLimit || 30000;
  const populationSize = config.populationSize || 10;
  const mutationRate = (config.mutationRate || 15) / 100;

  // Parçaları quantity'ye göre çoğalt
  const expandedPieces = [];
  for (const piece of pieces) {
    for (let q = 0; q < (piece.quantity || 1); q++) {
      // Her izin verilen rotasyon için en iyi olanı seçeceğiz
      expandedPieces.push({
        id: piece.id + (piece.quantity > 1 ? `_${q}` : ""),
        origId: piece.id,
        width: piece.width,
        height: piece.height,
        allowedRotations: piece.allowedRotations || [0, 180],
      });
    }
  }

  if (expandedPieces.length === 0) {
    self.postMessage({ type: "complete", result: { placements: [], markerLength: 0, efficiency: 0, wasteArea: 0, iterations: 0 } });
    return;
  }

  const totalPieceArea = expandedPieces.reduce((sum, p) => sum + p.width * p.height, 0);

  // ─── BLF Yerleştirme ─────────────────────────────────

  function placeBLF(order, rotations) {
    // Skyline tabanlı BLF
    const skyline = new Float64Array(Math.ceil(fabricWidth / 0.5)).fill(0); // 0.5cm çözünürlük
    const placements = [];

    for (let i = 0; i < order.length; i++) {
      const piece = expandedPieces[order[i]];
      const rot = rotations[i];
      const w = (rot === 90 || rot === 270) ? piece.height : piece.width;
      const h = (rot === 90 || rot === 270) ? piece.width : piece.height;
      const pw = w + spacing;
      const ph = h + spacing;

      // En iyi pozisyon bul (en düşük y, en sol x)
      let bestX = -1;
      let bestY = Infinity;
      const gridW = Math.ceil(pw / 0.5);
      const maxStartIdx = skyline.length - gridW;

      for (let sx = 0; sx <= maxStartIdx; sx++) {
        // Bu pozisyondaki max skyline yüksekliği
        let maxH = 0;
        for (let dx = 0; dx < gridW; dx++) {
          if (skyline[sx + dx] > maxH) maxH = skyline[sx + dx];
        }

        if (maxH < bestY) {
          bestY = maxH;
          bestX = sx;
        }
      }

      if (bestX < 0) continue;

      const x = bestX * 0.5;
      const y = bestY;

      placements.push({
        pieceId: piece.id,
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        rotation: rot,
        width: Math.round(w * 100) / 100,
        height: Math.round(h * 100) / 100,
      });

      // Skyline güncelle
      const gridH = Math.ceil(ph / 0.5);
      for (let dx = 0; dx < gridW && (bestX + dx) < skyline.length; dx++) {
        skyline[bestX + dx] = bestY + ph;
      }
    }

    // Marker uzunluğu = skyline max
    let markerLength = 0;
    for (let i = 0; i < skyline.length; i++) {
      if (skyline[i] > markerLength) markerLength = skyline[i];
    }

    const markerArea = markerLength * fabricWidth;
    const efficiency = markerArea > 0 ? (totalPieceArea / markerArea) * 100 : 0;
    const wasteArea = markerArea - totalPieceArea;

    return {
      placements,
      markerLength: Math.round(markerLength * 100) / 100,
      efficiency: Math.round(efficiency * 100) / 100,
      wasteArea: Math.round(wasteArea * 100) / 100,
    };
  }

  // ─── Genetik Algoritma ────────────────────────────────

  const n = expandedPieces.length;

  // İlk sıralama: büyükten küçüğe (alan)
  const initialOrder = Array.from({ length: n }, (_, i) => i);
  initialOrder.sort((a, b) => {
    const areaA = expandedPieces[a].width * expandedPieces[a].height;
    const areaB = expandedPieces[b].width * expandedPieces[b].height;
    return areaB - areaA;
  });

  function randomRotation(piece) {
    const rots = piece.allowedRotations;
    return rots[Math.floor(Math.random() * rots.length)];
  }

  // İlk populasyon
  let population = [];
  for (let p = 0; p < populationSize; p++) {
    const order = p === 0 ? [...initialOrder] : shuffle([...initialOrder]);
    const rotations = expandedPieces.map((piece) => randomRotation(piece));
    const result = placeBLF(order, rotations);
    population.push({ order, rotations, ...result });
  }

  // Sıralama
  population.sort((a, b) => b.efficiency - a.efficiency);

  let bestResult = population[0];
  let iteration = 0;
  const startTime = Date.now();
  let lastProgressTime = 0;

  // Ana döngü
  while (Date.now() - startTime < timeLimit && !cancelled) {
    iteration++;

    // Yeni nesil
    const newPopulation = [population[0]]; // Elitizm: en iyiyi koru

    while (newPopulation.length < populationSize) {
      // Tournament seçim
      const parent1 = tournament(population, 3);
      const parent2 = tournament(population, 3);

      // Order Crossover (OX)
      let childOrder = orderCrossover(parent1.order, parent2.order);
      let childRotations = [...parent1.rotations];

      // Mutasyon
      if (Math.random() < mutationRate) {
        const i = Math.floor(Math.random() * n);
        const j = Math.floor(Math.random() * n);
        [childOrder[i], childOrder[j]] = [childOrder[j], childOrder[i]];
        [childRotations[i], childRotations[j]] = [childRotations[j], childRotations[i]];
      }

      // Rotasyon mutasyonu
      if (Math.random() < mutationRate) {
        const idx = Math.floor(Math.random() * n);
        childRotations[idx] = randomRotation(expandedPieces[childOrder[idx]]);
      }

      const result = placeBLF(childOrder, childRotations);
      newPopulation.push({ order: childOrder, rotations: childRotations, ...result });
    }

    newPopulation.sort((a, b) => b.efficiency - a.efficiency);
    population = newPopulation;

    if (population[0].efficiency > bestResult.efficiency) {
      bestResult = population[0];
    }

    // Progress raporla (her 1 saniye)
    const now = Date.now();
    if (now - lastProgressTime > 1000) {
      lastProgressTime = now;
      self.postMessage({
        type: "progress",
        efficiency: bestResult.efficiency,
        iteration,
        markerLength: bestResult.markerLength,
      });
    }
  }

  // Sonuç
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

// ─── Yardımcı Fonksiyonlar ──────────────────────────────

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function tournament(population, size) {
  let best = null;
  for (let i = 0; i < size; i++) {
    const candidate = population[Math.floor(Math.random() * population.length)];
    if (!best || candidate.efficiency > best.efficiency) {
      best = candidate;
    }
  }
  return best;
}

function orderCrossover(parent1, parent2) {
  const n = parent1.length;
  const start = Math.floor(Math.random() * n);
  const end = start + Math.floor(Math.random() * (n - start));

  const child = new Array(n).fill(-1);
  // Segment kopyala
  for (let i = start; i <= end; i++) {
    child[i] = parent1[i];
  }

  // Kalan elemanları parent2'den sırayla doldur
  let pos = (end + 1) % n;
  for (let i = 0; i < n; i++) {
    const idx = (end + 1 + i) % n;
    const val = parent2[idx];
    if (!child.includes(val)) {
      child[pos] = val;
      pos = (pos + 1) % n;
    }
  }

  return child;
}
