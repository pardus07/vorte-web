"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Scissors,
  Ruler,
  Package,
  BarChart3,
  Download,
  Send,
  Play,
  Square,
  Layers,
  Loader2,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  type NestingPiece,
  type NestingConfig,
  type NestingOutput,
  type NestingPlacement,
  type MarkerPlan,
  DEFAULT_NESTING_CONFIG,
  CUTTING_BUFFERS,
  getMaxLayCount,
  optimizeMarkerCombination,
  calculateFabricConsumption,
  startNestingWorker,
} from "@/lib/production/nesting-engine";
import {
  generatePattern,
  type SizeKey,
  type ModelType,
  type Pattern,
} from "@/lib/production/pattern-engine";

// ─── Sabitler ─────────────────────────────────────────────

const SIZES: SizeKey[] = ["S", "M", "L", "XL", "XXL"];

const STAND_DEFS = {
  A: {
    label: "Stand A",
    total: 50,
    desc: "25 EB Siyah + 25 KK Ten",
    products: [
      { model: "boxer_brief" as ModelType, gender: "male" as const, color: "Siyah", qty: 25 },
      { model: "bikini" as ModelType, gender: "female" as const, color: "Ten", qty: 25 },
    ],
  },
  B: {
    label: "Stand B",
    total: 100,
    desc: "25 EB Siyah + 25 EB Lacivert + 25 KK Siyah + 25 KK Ten",
    products: [
      { model: "boxer_brief" as ModelType, gender: "male" as const, color: "Siyah", qty: 25 },
      { model: "boxer_brief" as ModelType, gender: "male" as const, color: "Lacivert", qty: 25 },
      { model: "bikini" as ModelType, gender: "female" as const, color: "Siyah", qty: 25 },
      { model: "bikini" as ModelType, gender: "female" as const, color: "Ten", qty: 25 },
    ],
  },
  C: {
    label: "Stand C",
    total: 150,
    desc: "Tum renkler: 3 Boxer + 3 Kulot",
    products: [
      { model: "boxer_brief" as ModelType, gender: "male" as const, color: "Siyah", qty: 25 },
      { model: "boxer_brief" as ModelType, gender: "male" as const, color: "Lacivert", qty: 25 },
      { model: "boxer_brief" as ModelType, gender: "male" as const, color: "Gri", qty: 25 },
      { model: "bikini" as ModelType, gender: "female" as const, color: "Siyah", qty: 25 },
      { model: "bikini" as ModelType, gender: "female" as const, color: "Beyaz", qty: 25 },
      { model: "bikini" as ModelType, gender: "female" as const, color: "Ten", qty: 25 },
    ],
  },
};

const CUTTING_METHODS = [
  { value: "straightKnife", label: "Dik Bicak" },
  { value: "automatic", label: "Otomatik CNC" },
  { value: "rotary", label: "Doner Bicak" },
  { value: "laser", label: "Lazer" },
];

const FABRIC_WIDTHS = [150, 160, 180];
const FABRIC_GSMS = [160, 180, 190];

interface ProductionOrder {
  id: string;
  orderNumber: string;
  stage: string;
  totalQuantity: number;
  items: { id: string; productName: string; sku: string; color: string; totalQuantity: number }[];
}

interface NestingProgress {
  efficiency: number;
  iteration: number;
  elapsed: number;
}

type TabMode = "stand" | "order";
type NestingStatus = "idle" | "running" | "complete" | "error";

// ─── SVG Rendering ─────────────────────────────────────────

function renderNestingSVG(
  placements: NestingPlacement[],
  fabricWidth: number,
  markerLength: number,
  scale = 3,
): string {
  const svgWidth = fabricWidth * scale;
  const svgHeight = markerLength * scale;

  const colors: Record<string, string> = {
    front: "#3B82F6",
    back: "#22C55E",
    gusset: "#F97316",
    waistband: "#8B5CF6",
    side: "#EC4899",
  };

  const pieces = placements
    .map((p) => {
      const color = p.pieceId.includes("front")
        ? colors.front
        : p.pieceId.includes("back")
          ? colors.back
          : p.pieceId.includes("gusset")
            ? colors.gusset
            : p.pieceId.includes("side")
              ? colors.side
              : colors.waistband;
      const shortName = p.pieceId.split("_").slice(0, 2).join(" ");
      const cx = (p.x + p.width / 2) * scale;
      const cy = (p.y + p.height / 2) * scale;

      // Gerçek Bezier path varsa kullan, yoksa dikdörtgen fallback
      if (p.svgPath) {
        // svgPath parça-lokal koordinatlarda (cm). Scale + translate uygula.
        // Rotasyon: parcainin merkezi etrafinda dondur.
        // Suprem penye: sadece 0 ve 180 derece izinli (iplik yonu korunur)
        const tx = p.x * scale;
        const ty = p.y * scale;
        const pcx = (p.width / 2) * scale; // parca merkez x (lokal)
        const pcy = (p.height / 2) * scale; // parca merkez y (lokal)
        const rotStr = p.rotation !== 0
          ? ` rotate(${p.rotation}, ${pcx}, ${pcy})`
          : "";
        return `<g transform="translate(${tx}, ${ty})">
      <g transform="scale(${scale})${rotStr}">
        <path d="${p.svgPath}" fill="${color}" fill-opacity="0.7" stroke="${color}" stroke-width="${0.3}" stroke-linejoin="round"/>
      </g>
    </g>
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="white" pointer-events="none">${shortName}</text>`;
      }

      // Dikdörtgen fallback (svgPath olmayan parçalar için)
      return `<rect x="${p.x * scale}" y="${p.y * scale}" width="${p.width * scale}" height="${p.height * scale}" fill="${color}" fill-opacity="0.7" stroke="${color}" stroke-width="1" rx="2"/>
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="white">${shortName}</text>`;
    })
    .join("\n");

  // Ölçü çizgileri
  const rulerTop = `<line x1="0" y1="2" x2="${svgWidth}" y2="2" stroke="#666" stroke-width="0.5"/>
    <text x="${svgWidth / 2}" y="14" text-anchor="middle" font-size="11" fill="#666">${fabricWidth} cm</text>`;
  const rulerLeft = `<line x1="2" y1="0" x2="2" y2="${svgHeight}" stroke="#666" stroke-width="0.5"/>
    <text x="14" y="${svgHeight / 2}" text-anchor="start" font-size="11" fill="#666" transform="rotate(-90, 14, ${svgHeight / 2})">${markerLength.toFixed(1)} cm</text>`;

  return `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto">
    <rect width="${svgWidth}" height="${svgHeight}" fill="#f8f9fa" stroke="#ddd" stroke-dasharray="5,5"/>
    ${rulerTop}
    ${rulerLeft}
    ${pieces}
  </svg>`;
}

// ─── Helper: Pattern -> NestingPiece ───────────────────────

function patternToNestingPieces(
  pattern: Pattern,
  quantity: number,
  colorPrefix: string,
): NestingPiece[] {
  return pattern.pieces.map((piece) => ({
    id: `${colorPrefix}_${piece.name}_${pattern.size}`,
    name: `${piece.label} ${pattern.size}`,
    width: piece.width,
    height: piece.height,
    quantity,
    allowedRotations: [0, 180],
    svgPath: piece.svgPath || "",
  }));
}

// ─── Ana Bileşen (Suspense wrapper — useSearchParams icin) ──

export default function PastalPlanlamaPage() {
  return (
    <Suspense fallback={null}>
      <PastalPlanlamaInner />
    </Suspense>
  );
}

function PastalPlanlamaInner() {
  // URL params — kalip editorunden gelen patternId
  const searchParams = useSearchParams();
  const urlPatternId = searchParams.get("patternId");

  // Yuklenen kalip (URL'den)
  const [loadedPatternId, setLoadedPatternId] = useState<string | null>(null);
  const [loadedPatternName, setLoadedPatternName] = useState("");

  // Tab & mode
  const [tabMode, setTabMode] = useState<TabMode>("stand");

  // Stand inputs
  const [standA, setStandA] = useState(0);
  const [standB, setStandB] = useState(0);
  const [standC, setStandC] = useState(0);
  const [fabricWidth, setFabricWidth] = useState(150);
  const [cuttingMethod, setCuttingMethod] = useState("straightKnife");
  const [fabricGSM, setFabricGSM] = useState(190);

  // Order mode
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Nesting state
  const [nestingStatus, setNestingStatus] = useState<NestingStatus>("idle");
  const [progress, setProgress] = useState<NestingProgress>({ efficiency: 0, iteration: 0, elapsed: 0 });
  const [nestingResult, setNestingResult] = useState<NestingOutput | null>(null);
  const [markerPlans, setMarkerPlans] = useState<MarkerPlan[]>([]);
  const [svgContent, setSvgContent] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Cancel ref
  const cancelRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // ─── Fetch pattern from URL param ───────────────────────
  useEffect(() => {
    if (!urlPatternId || urlPatternId === "saved") return;
    fetch(`/api/admin/patterns/${urlPatternId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) {
          setLoadedPatternId(data.id);
          setLoadedPatternName(data.name || `${data.modelType} ${data.baseSize}`);
        }
      })
      .catch(() => {});
  }, [urlPatternId]);

  // ─── Fetch orders ────────────────────────────────────────
  useEffect(() => {
    if (tabMode === "order") {
      setLoadingOrders(true);
      fetch("/api/admin/production-full")
        .then((r) => r.json())
        .then((data) => {
          setOrders(Array.isArray(data) ? data : data.orders || []);
        })
        .catch(() => setOrders([]))
        .finally(() => setLoadingOrders(false));
    }
  }, [tabMode]);

  // ─── Build nesting pieces from stand selections ──────────
  const buildStandPieces = useCallback((): NestingPiece[] => {
    const allPieces: NestingPiece[] = [];
    const stands: [number, keyof typeof STAND_DEFS][] = [
      [standA, "A"],
      [standB, "B"],
      [standC, "C"],
    ];

    for (const [count, key] of stands) {
      if (count <= 0) continue;
      const def = STAND_DEFS[key];
      for (const prod of def.products) {
        // Her beden icin 5 adet (25 / 5 beden = 5 per size)
        const perSize = (prod.qty / 5) * count;
        for (const size of SIZES) {
          try {
            const pattern = generatePattern(prod.model, size);
            const pieces = patternToNestingPieces(
              pattern,
              perSize,
              `${prod.color}_${prod.gender}`,
            );
            allPieces.push(...pieces);
          } catch {
            // fallback: basit parcalar
            allPieces.push({
              id: `${prod.color}_${prod.gender}_front_${size}`,
              name: `On Panel ${size}`,
              width: 25 + SIZES.indexOf(size) * 2,
              height: 30 + SIZES.indexOf(size) * 2,
              quantity: perSize,
              allowedRotations: [0, 180],
            });
            allPieces.push({
              id: `${prod.color}_${prod.gender}_back_${size}`,
              name: `Arka Panel ${size}`,
              width: 25 + SIZES.indexOf(size) * 2,
              height: 32 + SIZES.indexOf(size) * 2,
              quantity: perSize,
              allowedRotations: [0, 180],
            });
          }
        }
      }
    }
    return allPieces;
  }, [standA, standB, standC]);

  // ─── Build nesting pieces from selected order ────────────
  const buildOrderPieces = useCallback((): NestingPiece[] => {
    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order) return [];
    const allPieces: NestingPiece[] = [];

    for (const item of order.items) {
      const isMale = item.productName.toLowerCase().includes("boxer") || item.productName.toLowerCase().includes("erkek");
      const model: ModelType = isMale ? "boxer_brief" : "bikini";
      const perSize = Math.ceil(item.totalQuantity / 5);

      for (const size of SIZES) {
        try {
          const pattern = generatePattern(model, size);
          const pieces = patternToNestingPieces(pattern, perSize, `${item.color}_${isMale ? "male" : "female"}`);
          allPieces.push(...pieces);
        } catch {
          allPieces.push({
            id: `${item.color}_front_${size}`,
            name: `On Panel ${size}`,
            width: 25 + SIZES.indexOf(size) * 2,
            height: 30 + SIZES.indexOf(size) * 2,
            quantity: perSize,
            allowedRotations: [0, 180],
          });
        }
      }
    }
    return allPieces;
  }, [orders, selectedOrderId]);

  // ─── Compute order quantities for marker optimization ────
  const getOrderQuantities = useCallback((): Record<string, number> => {
    const qty: Record<string, number> = { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
    if (tabMode === "stand") {
      const totalProducts = standA * 50 + standB * 100 + standC * 150;
      const perSize = Math.ceil(totalProducts / 5);
      for (const s of SIZES) qty[s] = perSize;
    } else {
      const order = orders.find((o) => o.id === selectedOrderId);
      if (order) {
        const perSize = Math.ceil(order.totalQuantity / 5);
        for (const s of SIZES) qty[s] = perSize;
      }
    }
    return qty;
  }, [tabMode, standA, standB, standC, orders, selectedOrderId]);

  // ─── Start nesting ──────────────────────────────────────
  const handleStartNesting = useCallback(async () => {
    const pieces = tabMode === "stand" ? buildStandPieces() : buildOrderPieces();
    if (pieces.length === 0) {
      setErrorMsg("Lutfen gecerli bir siparis veya stand secin.");
      return;
    }

    setErrorMsg("");
    setNestingStatus("running");
    setNestingResult(null);
    setMarkerPlans([]);
    setSvgContent("");
    setProgress({ efficiency: 0, iteration: 0, elapsed: 0 });
    startTimeRef.current = Date.now();

    // Timer for elapsed
    timerRef.current = setInterval(() => {
      setProgress((prev) => ({
        ...prev,
        elapsed: Math.round((Date.now() - startTimeRef.current) / 1000),
      }));
    }, 500);

    const spacing = CUTTING_BUFFERS[cuttingMethod] || 5;
    const config: NestingConfig = {
      ...DEFAULT_NESTING_CONFIG,
      fabricWidth,
      spacing,
    };

    try {
      const { promise, cancel } = startNestingWorker(pieces, config, (eff, iter) => {
        setProgress((prev) => ({ ...prev, efficiency: eff, iteration: iter }));
      });
      cancelRef.current = cancel;

      const result = await promise;
      if (timerRef.current) clearInterval(timerRef.current);

      setNestingResult(result);
      setNestingStatus("complete");

      // Build marker plans
      const orderQty = getOrderQuantities();
      const { markers } = optimizeMarkerCombination(orderQty, fabricGSM);
      const plans: MarkerPlan[] = markers.map((m) => {
        const { totalM2, totalKg } = calculateFabricConsumption(
          result.markerLength,
          fabricWidth,
          m.layCount,
          m.repeats,
          fabricGSM,
        );
        return {
          sizeCombo: m.sizeCombo,
          markerLength: result.markerLength,
          efficiency: result.efficiency,
          fabricPerMarker: (result.markerLength / 100) * (fabricWidth / 100),
          layCount: m.layCount,
          markerRepeats: m.repeats,
          totalFabricM2: totalM2,
          totalFabricKg: totalKg,
          placements: result.placements,
        };
      });
      setMarkerPlans(plans);

      // Render SVG
      const svg = renderNestingSVG(result.placements, fabricWidth, result.markerLength);
      setSvgContent(svg);
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      setNestingStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Nesting basarisiz");
    }
  }, [tabMode, buildStandPieces, buildOrderPieces, fabricWidth, cuttingMethod, fabricGSM, getOrderQuantities]);

  // ─── Cancel nesting ──────────────────────────────────────
  const handleCancel = useCallback(() => {
    cancelRef.current?.();
    if (timerRef.current) clearInterval(timerRef.current);
    setNestingStatus("idle");
  }, []);

  // ─── Download SVG ────────────────────────────────────────
  const handleDownloadSVG = useCallback(() => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pastal-plan-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [svgContent]);

  // ─── Save result ─────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const handleSave = useCallback(async () => {
    if (!nestingResult || markerPlans.length === 0) return;
    setSaving(true);
    try {
      // patternId: URL'den geliyorsa kullan, yoksa yeni kaydet
      let patternId = loadedPatternId;

      if (!patternId) {
        // Temsili model belirle (ilk aktif stand'in ilk urunu)
        let repModel: ModelType = "boxer_brief";
        let repGender: "male" | "female" = "male";

        if (tabMode === "stand") {
          const stands: [number, keyof typeof STAND_DEFS][] = [
            [standA, "A"], [standB, "B"], [standC, "C"],
          ];
          for (const [count, key] of stands) {
            if (count > 0) {
              repModel = STAND_DEFS[key].products[0].model;
              repGender = STAND_DEFS[key].products[0].gender;
              break;
            }
          }
        }

        // Plan adi olustur
        const parts: string[] = [];
        if (tabMode === "stand") {
          if (standA > 0) parts.push(`A\u00d7${standA}`);
          if (standB > 0) parts.push(`B\u00d7${standB}`);
          if (standC > 0) parts.push(`C\u00d7${standC}`);
        } else {
          const order = orders.find((o) => o.id === selectedOrderId);
          if (order) parts.push(order.orderNumber);
        }
        const planName = `Pastal ${parts.join(", ")} \u2014 ${new Date().toLocaleDateString("tr-TR")}`;

        // Temsili pattern kaydet → patternId al
        const repPattern = generatePattern(repModel, "M");
        const patternRes = await fetch("/api/admin/patterns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: planName,
            modelType: repModel,
            gender: repGender,
            baseSize: "M",
            parameters: {
              source: "pastal-planlama",
              fabricWidth,
              fabricGSM,
              cuttingMethod,
              totalProducts: tabMode === "stand"
                ? standA * 50 + standB * 100 + standC * 150
                : (orders.find((o) => o.id === selectedOrderId)?.totalQuantity ?? 0),
            },
            pieces: repPattern.pieces,
          }),
        });
        if (!patternRes.ok) {
          const err = await patternRes.json();
          throw new Error(err.error || "Kalip kaydedilemedi");
        }
        const savedPattern = await patternRes.json();
        patternId = savedPattern.id;
      }

      // Her marker plani nesting result olarak kaydet
      for (const plan of markerPlans) {
        const nestRes = await fetch("/api/admin/nesting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patternId,
            fabricWidth,
            cuttingMethod,
            sizeCombo: plan.sizeCombo,
            placements: plan.placements,
            markerLength: plan.markerLength,
            efficiency: plan.efficiency,
            totalFabricM2: plan.totalFabricM2,
            totalFabricKg: plan.totalFabricKg,
            layCount: plan.layCount,
            markerRepeats: plan.markerRepeats,
          }),
        });
        if (!nestRes.ok) {
          const err = await nestRes.json();
          throw new Error(err.error || "Nesting sonucu kaydedilemedi");
        }
      }

      alert("Pastal plani kaydedildi.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kaydetme basarisiz oldu.");
    } finally {
      setSaving(false);
    }
  }, [nestingResult, markerPlans, fabricWidth, fabricGSM, cuttingMethod, tabMode, standA, standB, standC, orders, selectedOrderId, loadedPatternId]);

  // ─── Summary calculations ───────────────────────────────
  const totalFabricKg = markerPlans.reduce((s, m) => s + m.totalFabricKg, 0);
  const totalFabricM2 = markerPlans.reduce((s, m) => s + m.totalFabricM2, 0);
  const avgEfficiency = nestingResult?.efficiency ?? 0;
  const wastePercent = 100 - avgEfficiency;
  const totalLays = markerPlans.reduce((s, m) => s + m.layCount, 0);
  const totalRepeats = markerPlans.reduce((s, m) => s + m.markerRepeats, 0);

  // Eski BOM tahmini (basit: toplam adet * 0.035 kg per piece)
  const totalProducts = tabMode === "stand" ? standA * 50 + standB * 100 + standC * 150 : (orders.find((o) => o.id === selectedOrderId)?.totalQuantity ?? 0);
  const oldBomEstimate = totalProducts * 0.035;
  const savings = oldBomEstimate - totalFabricKg;
  const savingsPercent = oldBomEstimate > 0 ? (savings / oldBomEstimate) * 100 : 0;

  // Selected order detail
  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Pastal Planlama
          </h1>
          <p className="text-[13px] text-gray-500">
            Marker optimizasyonu ve nesting hesaplama
          </p>
        </div>
        <Badge variant="new" className="rounded-full px-3 py-1">Beta</Badge>
      </div>

      {/* ── Loaded pattern banner ─────────────────────────────── */}
      {loadedPatternId && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#7AC143]/20 bg-[#7AC143]/5 px-5 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7AC143]/10">
            <Link2 className="h-4 w-4 text-[#7AC143]" />
          </div>
          <span className="text-sm text-gray-700">
            Kalip editorunden yuklendi:{" "}
            <span className="font-semibold text-gray-900">{loadedPatternName}</span>
          </span>
          <CheckCircle2 className="ml-auto h-5 w-5 text-[#7AC143]" />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          BOLUM 1: Siparis / Stand Secimi
         ══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {/* Tab header */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTabMode("stand")}
            className={`flex-1 px-6 py-3.5 text-sm font-medium transition-colors ${
              tabMode === "stand"
                ? "text-[#7AC143] border-b-2 border-[#7AC143]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Package className="mb-px inline h-4 w-4 mr-2" />
            Stand Paketi
          </button>
          <button
            onClick={() => setTabMode("order")}
            className={`flex-1 px-6 py-3.5 text-sm font-medium transition-colors ${
              tabMode === "order"
                ? "text-[#7AC143] border-b-2 border-[#7AC143]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Layers className="mb-px inline h-4 w-4 mr-2" />
            Uretim Siparisi
          </button>
        </div>

        <div className="p-6">
          {tabMode === "stand" ? (
            /* ── Stand Paketi Modu ─────────────────────────────── */
            <div className="space-y-6">
              {/* Stand adetleri */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["A", "B", "C"] as const).map((key) => {
                  const def = STAND_DEFS[key];
                  const value = key === "A" ? standA : key === "B" ? standB : standC;
                  const setter = key === "A" ? setStandA : key === "B" ? setStandB : setStandC;
                  return (
                    <div
                      key={key}
                      className={`rounded-2xl border-2 p-5 transition-all ${
                        value > 0
                          ? "border-[#7AC143] bg-[#7AC143]/5 shadow-sm shadow-[#7AC143]/10"
                          : "border-gray-100 bg-white hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                            value > 0 ? "bg-[#7AC143]/10" : "bg-gray-50"
                          }`}>
                            <Package className={`h-4 w-4 ${value > 0 ? "text-[#7AC143]" : "text-gray-400"}`} />
                          </div>
                          <span className="font-semibold text-gray-900">{def.label}</span>
                        </div>
                        <Badge variant={value > 0 ? "new" : "subtle"} className="text-[11px]">
                          {def.total} urun
                        </Badge>
                      </div>
                      <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">{def.desc}</p>
                      <div className="flex items-center gap-2.5">
                        <label className="text-sm font-medium text-gray-600">Adet:</label>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={value}
                          onChange={(e) => setter(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:ring-2 focus:ring-[#7AC143]/20 outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Kumas & kesim parametreleri */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    <Ruler className="mb-px inline h-3.5 w-3.5 mr-1" />
                    Kumas Eni
                  </label>
                  <div className="relative">
                    <select
                      value={fabricWidth}
                      onChange={(e) => setFabricWidth(Number(e.target.value))}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:ring-2 focus:ring-[#7AC143]/20 outline-none"
                    >
                      {FABRIC_WIDTHS.map((w) => (
                        <option key={w} value={w}>{w} cm</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    <Scissors className="mb-px inline h-3.5 w-3.5 mr-1" />
                    Kesim Yontemi
                  </label>
                  <div className="relative">
                    <select
                      value={cuttingMethod}
                      onChange={(e) => setCuttingMethod(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:ring-2 focus:ring-[#7AC143]/20 outline-none"
                    >
                      {CUTTING_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    <BarChart3 className="mb-px inline h-3.5 w-3.5 mr-1" />
                    Kumas Gramaji
                  </label>
                  <div className="relative">
                    <select
                      value={fabricGSM}
                      onChange={(e) => setFabricGSM(Number(e.target.value))}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:ring-2 focus:ring-[#7AC143]/20 outline-none"
                    >
                      {FABRIC_GSMS.map((g) => (
                        <option key={g} value={g}>{g} gr/m&sup2;</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Serim Bilgileri */}
              <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-5 py-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-amber-600" />
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-amber-700">Serim Kurallari — %95 Pamuk %5 Elastan Suprem Penye</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px] text-amber-900/80">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span><strong>Tek yonlu serim</strong> — may donmesi ve renk tonu farki onlenir</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span><strong>Iplik yonu dikey</strong> — parcalar wales yonune paralel, 90° yasak</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span><strong>Min. 24 saat dinlendirme</strong> — kesim oncesi kumas gerilimi salimi</span>
                  </div>
                </div>
              </div>

              {/* Toplam ve Planla butonu */}
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-5 py-3.5">
                <div className="text-sm text-gray-600">
                  Toplam:{" "}
                  <span className="text-lg font-bold text-gray-900">
                    {standA * 50 + standB * 100 + standC * 150}
                  </span>{" "}
                  urun
                </div>
                <button
                  onClick={handleStartNesting}
                  disabled={nestingStatus === "running" || (standA + standB + standC === 0)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Play className="h-4 w-4" />
                  Planla
                </button>
              </div>
            </div>
          ) : (
            /* ── Uretim Siparisi Modu ─────────────────────────── */
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Uretim Siparisi Sec
                </label>
                {loadingOrders ? (
                  <div className="flex items-center gap-2.5 text-sm text-gray-500 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[#7AC143]" />
                    Siparisler yukleniyor...
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedOrderId}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:ring-2 focus:ring-[#7AC143]/20 outline-none"
                    >
                      <option value="">-- Siparis Sec --</option>
                      {orders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.orderNumber} — {o.totalQuantity} adet ({o.stage})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Secili siparisin urun kalemleri */}
              {selectedOrder && (
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50/80">
                      <tr>
                        <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Urun</th>
                        <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Renk</th>
                        <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Adet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item) => (
                        <tr key={item.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{item.productName}</td>
                          <td className="px-4 py-3 text-gray-600">{item.color}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{item.totalQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Kumas parametreleri */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">Kumas Eni</label>
                  <div className="relative">
                    <select
                      value={fabricWidth}
                      onChange={(e) => setFabricWidth(Number(e.target.value))}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:ring-2 focus:ring-[#7AC143]/20 outline-none"
                    >
                      {FABRIC_WIDTHS.map((w) => (
                        <option key={w} value={w}>{w} cm</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">Kesim Yontemi</label>
                  <div className="relative">
                    <select
                      value={cuttingMethod}
                      onChange={(e) => setCuttingMethod(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:ring-2 focus:ring-[#7AC143]/20 outline-none"
                    >
                      {CUTTING_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">Kumas Gramaji</label>
                  <div className="relative">
                    <select
                      value={fabricGSM}
                      onChange={(e) => setFabricGSM(Number(e.target.value))}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:ring-2 focus:ring-[#7AC143]/20 outline-none"
                    >
                      {FABRIC_GSMS.map((g) => (
                        <option key={g} value={g}>{g} gr/m&sup2;</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleStartNesting}
                  disabled={nestingStatus === "running" || !selectedOrderId}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Play className="h-4 w-4" />
                  Planla
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hata mesaji */}
      {errorMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-700">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-red-100">
            <Square className="h-4 w-4 text-red-500" />
          </div>
          {errorMsg}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          BOLUM 2: Nesting Gorsellestirme
         ══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <Layers className="h-5 w-5 text-[#7AC143]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Nesting Gorsellestirme</h2>
              <p className="text-[12px] text-gray-500">Parca yerlesimleri ve kumas kullanimi</p>
            </div>
          </div>
          {nestingStatus === "running" && (
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50"
            >
              <Square className="h-3.5 w-3.5" />
              Durdur
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Idle state */}
          {nestingStatus === "idle" && (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
                <Scissors className="h-8 w-8 text-gray-300" />
              </div>
              <p className="mt-4 text-sm font-medium text-gray-400">Siparis secip planlama baslatin</p>
              <p className="mt-1 text-[12px] text-gray-300">Yukaridaki formdan parametreleri ayarlayin</p>
            </div>
          )}

          {/* Running state */}
          {nestingStatus === "running" && (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-6">
              {/* Progress bar */}
              <div className="w-full max-w-lg space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">Nesting hesaplaniyor...</span>
                  <span className="font-bold text-[#7AC143]">%{progress.efficiency.toFixed(1)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#7AC143] transition-all duration-500"
                    style={{ width: `${Math.min(progress.efficiency, 98)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-center">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Verimlilik</div>
                  <div className="text-lg font-bold text-[#7AC143]">%{progress.efficiency.toFixed(1)}</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-center">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Iterasyon</div>
                  <div className="text-lg font-bold text-gray-900">{progress.iteration}</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-center">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Sure</div>
                  <div className="text-lg font-bold text-gray-900">{progress.elapsed}sn</div>
                </div>
              </div>
              <Loader2 className="h-6 w-6 animate-spin text-[#7AC143]" />
            </div>
          )}

          {/* Error state */}
          {nestingStatus === "error" && (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <Square className="h-8 w-8 text-red-400" />
              </div>
              <p className="mt-4 text-sm font-semibold text-red-600">Nesting Hatasi</p>
              <p className="mt-1 text-[13px] text-gray-500">{errorMsg}</p>
            </div>
          )}

          {/* Complete state with SVG */}
          {nestingStatus === "complete" && svgContent && (
            <div className="space-y-5">
              {/* SVG canvas */}
              <div
                className="min-h-[400px] overflow-auto rounded-2xl border border-gray-100 bg-white p-4"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-gray-100 bg-gray-50/60 px-5 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mr-1">Parcalar:</span>
                <span className="flex items-center gap-1.5 text-[12px] text-gray-600">
                  <span className="inline-block h-3 w-3 rounded bg-[#3B82F6]" /> On Panel
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-gray-600">
                  <span className="inline-block h-3 w-3 rounded bg-[#22C55E]" /> Arka Panel
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-gray-600">
                  <span className="inline-block h-3 w-3 rounded bg-[#EC4899]" /> Yan Panel
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-gray-600">
                  <span className="inline-block h-3 w-3 rounded bg-[#F97316]" /> Kasik
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-gray-600">
                  <span className="inline-block h-3 w-3 rounded bg-[#8B5CF6]" /> Bel Lastigi
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-gray-600">
                  <span className="inline-block h-3 w-3 rounded border border-dashed border-gray-400 bg-gray-200" /> Fire
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          BOLUM 3: Sonuc + Entegrasyon
         ══════════════════════════════════════════════════════════ */}
      {nestingStatus === "complete" && (
        <div className="space-y-6">
          {/* ── Ozet Kartlar ────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="text-[12px] font-medium uppercase tracking-wider text-gray-500">Toplam Kumas</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{totalFabricKg.toFixed(2)} <span className="text-sm font-medium text-gray-500">kg</span></div>
              <div className="mt-0.5 text-[12px] text-gray-400">{totalFabricM2.toFixed(2)} m&sup2;</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                  <BarChart3 className="h-5 w-5 text-[#7AC143]" />
                </div>
              </div>
              <div className="text-[12px] font-medium uppercase tracking-wider text-gray-500">Verimlilik</div>
              <div className="mt-1 text-2xl font-bold text-[#7AC143]">%{avgEfficiency.toFixed(1)}</div>
              <div className="mt-0.5 text-[12px] text-gray-400">Marker verimliligi</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  <Scissors className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <div className="text-[12px] font-medium uppercase tracking-wider text-gray-500">Fire</div>
              <div className="mt-1 text-2xl font-bold text-amber-600">%{wastePercent.toFixed(1)}</div>
              <div className="mt-0.5 text-[12px] text-gray-400">Kullanilmayan alan</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                  <Layers className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="text-[12px] font-medium uppercase tracking-wider text-gray-500">Serim</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                {totalLays} <span className="text-sm font-medium text-gray-500">kat</span> <span className="text-gray-300 mx-0.5">x</span> {totalRepeats}
              </div>
              <div className="mt-0.5 text-[12px] text-gray-400">Toplam serim</div>
            </div>
          </div>

          {/* ── Marker Plan Tablosu ─────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                <BarChart3 className="h-5 w-5 text-[#7AC143]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Marker Plani</h2>
                <p className="text-[12px] text-gray-500">Beden kombinasyonu bazinda detaylar</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50/80">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Beden Kombinasyonu</th>
                    <th className="px-5 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Marker Uzunlugu</th>
                    <th className="px-5 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Verimlilik</th>
                    <th className="px-5 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Kat Sayisi</th>
                    <th className="px-5 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Tekrar</th>
                    <th className="px-5 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Kumas (m&sup2;)</th>
                    <th className="px-5 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Kumas (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {markerPlans.map((plan, idx) => (
                    <tr key={idx} className="border-t border-gray-50 transition-colors hover:bg-gray-50/50">
                      <td className="px-5 py-3.5">
                        <Badge variant="subtle" className="text-[11px] font-medium">{plan.sizeCombo}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-700">{plan.markerLength.toFixed(1)} cm</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                          plan.efficiency >= 80
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          %{plan.efficiency.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-700">{plan.layCount}</td>
                      <td className="px-5 py-3.5 text-right text-gray-700">{plan.markerRepeats}</td>
                      <td className="px-5 py-3.5 text-right text-gray-700">{plan.totalFabricM2.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{plan.totalFabricKg.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                    <td className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500" colSpan={5}>Toplam</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{totalFabricM2.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-gray-900">{totalFabricKg.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── BOM Karsilastirma ───────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <Ruler className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">BOM Karsilastirma</h3>
                <p className="text-[12px] text-gray-500">Eski tahmin ile yeni hesaplamayi karsilastirin</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 text-center">
                <div className="text-[12px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Eski BOM Tahmini</div>
                <div className="text-2xl font-bold text-gray-500">{oldBomEstimate.toFixed(2)} <span className="text-sm font-medium">kg</span></div>
                <div className="mt-1 text-[12px] text-gray-400">{totalProducts} urun x 0.035 kg</div>
              </div>
              <div className="rounded-2xl border border-[#7AC143]/20 bg-[#7AC143]/5 p-5 text-center">
                <div className="text-[12px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Yeni Pastal Hesabi</div>
                <div className="text-2xl font-bold text-[#7AC143]">{totalFabricKg.toFixed(2)} <span className="text-sm font-medium">kg</span></div>
                <div className="mt-1 text-[12px] text-gray-400">Nesting optimizasyonu ile</div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <div className="text-[12px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Tasarruf</div>
                <div className="text-2xl font-bold text-emerald-600">
                  {savings > 0 ? `${savings.toFixed(2)} kg` : "\u2014"}
                </div>
                {savingsPercent > 0 && (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[12px] font-semibold text-emerald-700">
                    %{savingsPercent.toFixed(1)} tasarruf
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Aksiyon Butonlari ───────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333] disabled:opacity-50 disabled:pointer-events-none"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Package className="h-4 w-4" />
              )}
              Sonucu Kaydet
            </button>
            <button
              onClick={handleDownloadSVG}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              SVG Indir
            </button>
            <button
              onClick={() => (window.location.href = "/admin/tedarikciler?tab=quotes")}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <Send className="h-4 w-4" />
              Tedarikçiye Teklif Gonder
              <ArrowRight className="h-3 w-3 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
