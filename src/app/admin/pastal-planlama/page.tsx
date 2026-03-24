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

const FABRIC_WIDTHS = [150, 180];
const FABRIC_GSMS = [160, 180];

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
        // Rotasyon: parçanın merkezi etrafında döndür.
        const tx = p.x * scale;
        const ty = p.y * scale;
        const rotStr = p.rotation !== 0
          ? ` rotate(${p.rotation}, ${cx - tx}, ${cy - ty})`
          : "";
        return `<g transform="translate(${tx}, ${ty}) scale(${scale})${rotStr}">
      <path d="${p.svgPath}" fill="${color}" fill-opacity="0.7" stroke="${color}" stroke-width="${0.3}" stroke-linejoin="round"/>
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
  const [fabricGSM, setFabricGSM] = useState(180);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#7AC143]/10 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-[#7AC143]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1A1A1A]">Pastal Planlama</h1>
              <p className="text-sm text-gray-500">Marker optimizasyonu ve nesting hesaplama</p>
            </div>
          </div>
          <Badge variant="new" className="rounded-full px-3 py-1">Beta</Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Yuklenen kalip banner */}
        {loadedPatternId && (
          <div className="flex items-center gap-3 bg-[#7AC143]/5 border border-[#7AC143]/20 rounded-xl px-5 py-3">
            <Link2 className="w-4 h-4 text-[#7AC143] flex-shrink-0" />
            <span className="text-sm text-[#1A1A1A]">
              Kalip editorunden yuklendi:{" "}
              <span className="font-semibold">{loadedPatternName}</span>
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#7AC143]" />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            BOLUM 1: Siparis / Stand Secimi
           ══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tab header */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setTabMode("stand")}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                tabMode === "stand"
                  ? "text-[#7AC143] border-b-2 border-[#7AC143] bg-[#7AC143]/5"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Stand Paketi
            </button>
            <button
              onClick={() => setTabMode("order")}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                tabMode === "order"
                  ? "text-[#7AC143] border-b-2 border-[#7AC143] bg-[#7AC143]/5"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Layers className="w-4 h-4 inline mr-2" />
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
                        className={`border-2 rounded-xl p-4 transition-colors ${
                          value > 0 ? "border-[#7AC143] bg-[#7AC143]/5" : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-[#1A1A1A]">{def.label}</span>
                          <Badge variant={value > 0 ? "new" : "outline"} className="text-xs">
                            {def.total} urun
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{def.desc}</p>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">Adet:</label>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={value}
                            onChange={(e) => setter(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm focus:ring-2 focus:ring-[#7AC143] focus:border-[#7AC143] outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Kumas & kesim parametreleri */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Ruler className="w-3.5 h-3.5 inline mr-1" />
                      Kumas Eni
                    </label>
                    <select
                      value={fabricWidth}
                      onChange={(e) => setFabricWidth(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143] outline-none"
                    >
                      {FABRIC_WIDTHS.map((w) => (
                        <option key={w} value={w}>{w} cm</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Scissors className="w-3.5 h-3.5 inline mr-1" />
                      Kesim Yontemi
                    </label>
                    <select
                      value={cuttingMethod}
                      onChange={(e) => setCuttingMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143] outline-none"
                    >
                      {CUTTING_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <BarChart3 className="w-3.5 h-3.5 inline mr-1" />
                      Kumas Gramaji
                    </label>
                    <select
                      value={fabricGSM}
                      onChange={(e) => setFabricGSM(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143] outline-none"
                    >
                      {FABRIC_GSMS.map((g) => (
                        <option key={g} value={g}>{g} gr/m&sup2;</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Toplam ve Planla butonu */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-sm text-gray-600">
                    Toplam:{" "}
                    <span className="font-bold text-[#1A1A1A]">
                      {standA * 50 + standB * 100 + standC * 150}
                    </span>{" "}
                    urun
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleStartNesting}
                    disabled={nestingStatus === "running" || (standA + standB + standC === 0)}
                  >
                    <Play className="w-4 h-4" />
                    Planla
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Uretim Siparisi Modu ─────────────────────────── */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Uretim Siparisi Sec
                  </label>
                  {loadingOrders ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Siparisler yukleniyor...
                    </div>
                  ) : (
                    <select
                      value={selectedOrderId}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143] outline-none"
                    >
                      <option value="">-- Siparis Sec --</option>
                      {orders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.orderNumber} — {o.totalQuantity} adet ({o.stage})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Secili siparisin urun kalemleri */}
                {selectedOrder && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Urun</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Renk</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-600">Adet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item) => (
                          <tr key={item.id} className="border-t border-gray-100">
                            <td className="px-4 py-2">{item.productName}</td>
                            <td className="px-4 py-2">{item.color}</td>
                            <td className="px-4 py-2 text-right font-medium">{item.totalQuantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Kumas parametreleri */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kumas Eni</label>
                    <select
                      value={fabricWidth}
                      onChange={(e) => setFabricWidth(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143] outline-none"
                    >
                      {FABRIC_WIDTHS.map((w) => (
                        <option key={w} value={w}>{w} cm</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kesim Yontemi</label>
                    <select
                      value={cuttingMethod}
                      onChange={(e) => setCuttingMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143] outline-none"
                    >
                      {CUTTING_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kumas Gramaji</label>
                    <select
                      value={fabricGSM}
                      onChange={(e) => setFabricGSM(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143] outline-none"
                    >
                      {FABRIC_GSMS.map((g) => (
                        <option key={g} value={g}>{g} gr/m&sup2;</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleStartNesting}
                    disabled={nestingStatus === "running" || !selectedOrderId}
                  >
                    <Play className="w-4 h-4" />
                    Planla
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hata mesaji */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            BOLUM 2: Nesting Gorsellestirme
           ══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7AC143]" />
              Nesting Gorsellestirme
            </h2>
            {nestingStatus === "running" && (
              <Button variant="destructive" size="sm" onClick={handleCancel}>
                <Square className="w-3 h-3" />
                Durdur
              </Button>
            )}
          </div>

          <div className="p-6">
            {nestingStatus === "idle" && (
              <div className="min-h-[300px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Scissors className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Siparis secip planlama baslatin</p>
                </div>
              </div>
            )}

            {nestingStatus === "running" && (
              <div className="min-h-[300px] flex flex-col items-center justify-center gap-6">
                {/* Progress bar */}
                <div className="w-full max-w-lg">
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#7AC143] rounded-full transition-all duration-500 animate-pulse"
                      style={{ width: `${Math.min(progress.efficiency, 98)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-600">
                    Verimlilik:{" "}
                    <span className="font-bold text-[#7AC143]">%{progress.efficiency.toFixed(1)}</span>
                  </span>
                  <span className="text-gray-600">
                    Iterasyon:{" "}
                    <span className="font-bold text-[#1A1A1A]">{progress.iteration}</span>
                  </span>
                  <span className="text-gray-600">
                    Sure:{" "}
                    <span className="font-bold text-[#1A1A1A]">{progress.elapsed}sn</span>
                  </span>
                </div>
                <Loader2 className="w-6 h-6 animate-spin text-[#7AC143]" />
              </div>
            )}

            {nestingStatus === "error" && (
              <div className="min-h-[300px] flex items-center justify-center text-red-500">
                <div className="text-center">
                  <p className="font-medium mb-2">Nesting Hatasi</p>
                  <p className="text-sm text-gray-500">{errorMsg}</p>
                </div>
              </div>
            )}

            {nestingStatus === "complete" && svgContent && (
              <div className="space-y-4">
                {/* SVG canvas */}
                <div
                  className="min-h-[400px] bg-white border border-gray-200 rounded-xl p-4 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#3B82F6]" /> On Panel
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#22C55E]" /> Arka Panel
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#EC4899]" /> Yan Panel
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#F97316]" /> Kasik
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#8B5CF6]" /> Bel Lastigi
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-gray-200 border border-dashed border-gray-400" /> Fire
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            BOLUM 3: Sonuc + Entegrasyon
           ══════════════════════════════════════════════════════ */}
        {nestingStatus === "complete" && (
          <div className="space-y-6">
            {/* Marker Plan Tablosu */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#7AC143]" />
                  Marker Plani
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Beden Kombinasyonu</th>
                      <th className="px-4 py-3 text-right font-medium">Marker Uzunlugu</th>
                      <th className="px-4 py-3 text-right font-medium">Verimlilik</th>
                      <th className="px-4 py-3 text-right font-medium">Kat Sayisi</th>
                      <th className="px-4 py-3 text-right font-medium">Tekrar</th>
                      <th className="px-4 py-3 text-right font-medium">Kumas (m&sup2;)</th>
                      <th className="px-4 py-3 text-right font-medium">Kumas (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {markerPlans.map((plan, idx) => (
                      <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">{plan.sizeCombo}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">{plan.markerLength.toFixed(1)} cm</td>
                        <td className="px-4 py-3 text-right">
                          <span className={plan.efficiency >= 80 ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                            %{plan.efficiency.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{plan.layCount}</td>
                        <td className="px-4 py-3 text-right">{plan.markerRepeats}</td>
                        <td className="px-4 py-3 text-right">{plan.totalFabricM2.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-medium">{plan.totalFabricKg.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-medium">
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3" colSpan={5}>Toplam</td>
                      <td className="px-4 py-3 text-right">{totalFabricM2.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{totalFabricKg.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Ozet Kartlar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-xs text-gray-500 mb-1">Toplam Kumas</div>
                <div className="text-2xl font-bold text-[#1A1A1A]">{totalFabricKg.toFixed(2)} kg</div>
                <div className="text-xs text-gray-400 mt-1">{totalFabricM2.toFixed(2)} m&sup2;</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-xs text-gray-500 mb-1">Verimlilik</div>
                <div className="text-2xl font-bold text-[#7AC143]">%{avgEfficiency.toFixed(1)}</div>
                <div className="text-xs text-gray-400 mt-1">Marker verimliligi</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-xs text-gray-500 mb-1">Fire</div>
                <div className="text-2xl font-bold text-amber-600">%{wastePercent.toFixed(1)}</div>
                <div className="text-xs text-gray-400 mt-1">Kullanilmayan alan</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-xs text-gray-500 mb-1">Serim</div>
                <div className="text-2xl font-bold text-[#1A1A1A]">
                  {totalLays} kat x {totalRepeats}
                </div>
                <div className="text-xs text-gray-400 mt-1">Toplam serim</div>
              </div>
            </div>

            {/* BOM Karsilastirma */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-4">BOM Karsilastirma</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Eski BOM Tahmini</div>
                  <div className="text-xl font-bold text-gray-600">{oldBomEstimate.toFixed(2)} kg</div>
                </div>
                <div className="text-center p-4 bg-[#7AC143]/5 rounded-lg border border-[#7AC143]/20">
                  <div className="text-xs text-gray-500 mb-1">Yeni Pastal Hesabi</div>
                  <div className="text-xl font-bold text-[#7AC143]">{totalFabricKg.toFixed(2)} kg</div>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-xs text-gray-500 mb-1">Tasarruf</div>
                  <div className="text-xl font-bold text-emerald-600">
                    {savings > 0 ? `${savings.toFixed(2)} kg` : "—"}
                  </div>
                  {savingsPercent > 0 && (
                    <div className="text-xs text-emerald-500 mt-1">%{savingsPercent.toFixed(1)} tasarruf</div>
                  )}
                </div>
              </div>
            </div>

            {/* Aksiyon Butonlari */}
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={handleSave} loading={saving}>
                <Package className="w-4 h-4" />
                Sonucu Kaydet
              </Button>
              <Button variant="outline" onClick={handleDownloadSVG}>
                <Download className="w-4 h-4" />
                SVG Indir
              </Button>
              <Button
                variant="ghost"
                onClick={() => (window.location.href = "/admin/tedarikciler?tab=quotes")}
              >
                <Send className="w-4 h-4" />
                Tedarikçiye Teklif Gonder
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
