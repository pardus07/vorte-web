"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Scissors,
  ZoomIn,
  ZoomOut,
  Download,
  Save,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Ruler,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  generatePattern,
  patternToSVG,
  validatePattern,
  calculateRealFabricArea,
  type Pattern,
  type ValidationResult,
  type ModelType,
  type SizeKey,
} from "@/lib/production/pattern-engine";
import {
  PATTERN_TEMPLATES,
  MODEL_LABELS_TR,
  PIECE_LABELS_TR,
  SEAM_LABELS_TR,
} from "@/lib/production/pattern-templates";

// ─── MODEL KARTLARI VERİSİ ─────────────────────────────────

const MODEL_CARDS: {
  key: ModelType;
  name: string;
  subtitle: string;
  gender: "male" | "female";
}[] = [
  {
    key: "boxer_brief",
    name: "Boxer Brief",
    subtitle: "Orta paca, klasik kesim",
    gender: "male",
  },
  {
    key: "trunk",
    name: "Trunk",
    subtitle: "Kisa paca, modern kesim",
    gender: "male",
  },
  {
    key: "bikini",
    name: "Bikini",
    subtitle: "V-kesim, orta bel",
    gender: "female",
  },
  {
    key: "hipster",
    name: "Hipster",
    subtitle: "Duz kesim, dusuk bel",
    gender: "female",
  },
];

const ALL_SIZES: SizeKey[] = ["S", "M", "L", "XL", "XXL"];

// ─── ANA SAYFA BİLEŞENİ ────────────────────────────────────

export default function KalipEditoruPage() {
  const [selectedModel, setSelectedModel] = useState<ModelType>("boxer_brief");
  const [selectedSizes, setSelectedSizes] = useState<SizeKey[]>(["M"]);
  const [currentViewSize, setCurrentViewSize] = useState<SizeKey>("M");
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // ── Beden toggle ──
  const toggleSize = useCallback((size: SizeKey) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  }, []);

  // ── Kalip olustur ──
  const handleGenerate = useCallback(() => {
    const p = generatePattern(selectedModel, currentViewSize);
    setPattern(p);
    setValidation(validatePattern(p));
    setSvgContent(patternToSVG(p, 4));
    setSavedId(null);
  }, [selectedModel, currentViewSize]);

  // ── Beden degistir (goruntuleme) ──
  const handleViewSize = useCallback(
    (size: SizeKey) => {
      setCurrentViewSize(size);
      const p = generatePattern(selectedModel, size);
      setPattern(p);
      setValidation(validatePattern(p));
      setSvgContent(patternToSVG(p, 4));
    },
    [selectedModel],
  );

  // ── Zoom ──
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  // ── SVG indir ──
  const handleDownloadSVG = useCallback(() => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kalip-${selectedModel}-${currentViewSize}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [svgContent, selectedModel, currentViewSize]);

  // ── Kaydet ──
  const handleSave = useCallback(async () => {
    if (!pattern) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${MODEL_LABELS_TR[pattern.modelType]} ${pattern.size}`,
          modelType: pattern.modelType,
          gender: pattern.gender,
          baseSize: pattern.size,
          parameters: {
            sizes: selectedSizes,
            totalAreaCm2: pattern.totalAreaCm2,
            totalAreaWithSeamCm2: pattern.totalAreaWithSeamCm2,
            fabricAreaM2: pattern.fabricAreaM2,
            metadata: pattern.metadata,
            svg: svgContent,
          },
          pieces: pattern.pieces,
          grading: selectedSizes.length > 1 ? { sizes: selectedSizes } : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedId(data.id || "saved");
      }
    } catch {
      // sessiz hata
    } finally {
      setSaving(false);
    }
  }, [pattern, selectedSizes, svgContent]);

  // ── Gercek kumasa alani ──
  const realFabricArea = pattern ? calculateRealFabricArea(pattern) : 0;

  return (
    <div className="space-y-6">
      {/* ═══════ HEADER ═══════ */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7AC143]/10">
              <Scissors className="h-5 w-5 text-[#7AC143]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Kalip Editoru
              </h1>
              <p className="text-[13px] text-gray-500">
                Parametrik kalip olusturma ve dogrulama
              </p>
            </div>
          </div>
        </div>
        <Link href="/admin/uretim">
          <button className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            Uretim Paneline Don
          </button>
        </Link>
      </div>

      {/* ═══════ BOLUM 1: MODEL SECIMI ═══════ */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Model Secimi
        </h2>

        {/* Model kartlari */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {MODEL_CARDS.map((model) => {
            const isSelected = selectedModel === model.key;
            return (
              <button
                key={model.key}
                onClick={() => setSelectedModel(model.key)}
                className={`relative rounded-2xl border-2 p-5 text-left transition-all hover:shadow-md ${
                  isSelected
                    ? "border-[#7AC143] bg-[#7AC143]/5 shadow-sm"
                    : "border-gray-100 bg-white hover:border-gray-200"
                }`}
              >
                {isSelected && (
                  <div className="absolute right-3 top-3">
                    <CheckCircle2 className="h-5 w-5 text-[#7AC143]" />
                  </div>
                )}
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
                    model.gender === "male"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-pink-50 text-pink-600"
                  }`}
                >
                  <User className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {model.name}
                </div>
                <div className="mt-1 text-[12px] text-gray-500">
                  {model.subtitle}
                </div>
                <Badge
                  variant={model.gender === "male" ? "outline" : "new"}
                  className="mt-3 text-[10px]"
                >
                  {model.gender === "male" ? "Erkek" : "Kadin"}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Beden secimi */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Bedenler:</span>
          {ALL_SIZES.map((size) => {
            const isActive = selectedSizes.includes(size);
            return (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                className={`h-10 w-14 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#7AC143] text-white shadow-sm"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>

        {/* Kalip olustur butonu */}
        <div className="mt-6">
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333]"
          >
            <Scissors className="h-4 w-4" />
            Kalip Olustur
          </button>
        </div>
      </div>

      {/* ═══════ BOLUM 2: KALIP GORSELLESTIRME ═══════ */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Kalip Gorsellestirme
          </h2>
        </div>

        {!pattern ? (
          <div className="flex min-h-[480px] items-center justify-center p-5">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
                <Ruler className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-base font-medium text-gray-400">
                Model secip kalip olusturun
              </p>
              <p className="mt-1 text-[13px] text-gray-400">
                Yukaridaki model ve beden secimlerini yapip &quot;Kalip
                Olustur&quot; butonuna basin.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5">
            {/* Beden + zoom kontrolleri */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Beden:
                </span>
                {selectedSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => handleViewSize(size)}
                    className={`h-8 w-12 rounded-lg text-xs font-semibold transition-all ${
                      currentViewSize === size
                        ? "bg-[#7AC143] text-white shadow-sm"
                        : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleZoomOut}
                  className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 shadow-sm hover:bg-gray-50"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="w-14 text-center text-xs font-medium text-gray-500">
                  {(zoom * 100).toFixed(0)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 shadow-sm hover:bg-gray-50"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <div className="mx-1 h-5 w-px bg-gray-200" />
                <button
                  onClick={handleDownloadSVG}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  SVG Indir
                </button>
              </div>
            </div>

            {/* SVG goruntuleyici */}
            <div className="min-h-[480px] overflow-auto rounded-xl border border-gray-100 bg-gray-50/40 p-6">
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ═══════ BOLUM 3: OLCU TABLOSU + DOGRULAMA ═══════ */}
      {pattern && validation && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Sol: Olcu Tablosu */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="border-b bg-gray-50/80 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Olcu Tablosu
                <span className="ml-2 text-[12px] font-normal text-gray-500">
                  {MODEL_LABELS_TR[pattern.modelType]} ({pattern.size})
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/80">
                    <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Parca Adi
                    </th>
                    <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      En (cm)
                    </th>
                    <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Boy (cm)
                    </th>
                    <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Alan (cm2)
                    </th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Dikis Tipi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pattern.pieces.map((piece) => {
                    const seamKey =
                      piece.name === "gusset" ||
                      piece.name === "gusset_lining"
                        ? "crotch"
                        : piece.name === "waistband"
                          ? "waist"
                          : "side";
                    const seamType =
                      pattern.metadata.seamType[seamKey] || "flatlock";
                    return (
                      <tr key={piece.name} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-sm"
                              style={{ backgroundColor: piece.color }}
                            />
                            {PIECE_LABELS_TR[piece.name] || piece.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                          {piece.width.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                          {piece.height.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                          {piece.areaCm2.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {SEAM_LABELS_TR[seamType] || seamType}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-gray-100 bg-gray-50/60">
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      Toplam
                    </td>
                    <td className="px-4 py-3 text-right" colSpan={2} />
                    <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-gray-900">
                      {pattern.totalAreaCm2.toFixed(1)}
                    </td>
                    <td />
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500">
                      Gercek Kumas Alani
                      <span className="ml-1 text-[11px] text-gray-400">(dikis+cekme dahil)</span>
                    </td>
                    <td className="px-4 py-3 text-right" colSpan={2} />
                    <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-[#7AC143]">
                      {(realFabricArea * 10000).toFixed(1)} cm2
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-400">
                      ({realFabricArea.toFixed(4)} m2)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Sag: Dogrulama Sonuclari */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="border-b bg-gray-50/80 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Dogrulama Sonuclari
              </h3>
            </div>
            <div className="space-y-3 p-5">
              {/* Genel durum */}
              <div
                className={`flex items-center gap-3 rounded-xl px-4 py-3.5 ${
                  validation.valid
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {validation.valid ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                    <XCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
                  </div>
                )}
                <span className="text-sm font-semibold">
                  {validation.valid
                    ? "Kalip dogrulamasi basarili"
                    : "Kalip dogrulamasi basarisiz"}
                </span>
              </div>

              {/* Kontroller */}
              <div className="space-y-2">
                {/* Hatalar */}
                {validation.errors.map((err, i) => (
                  <div
                    key={`err-${i}`}
                    className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 text-sm"
                  >
                    <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                    <span className="text-red-700">{err}</span>
                  </div>
                ))}

                {/* Uyarilar */}
                {validation.warnings.map((warn, i) => (
                  <div
                    key={`warn-${i}`}
                    className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                    <span className="text-amber-700">{warn}</span>
                  </div>
                ))}

                {/* Dogrulama kontrolleri — gercek validation.checks */}
                {validation.checks.map((check, i) => (
                  <div
                    key={`check-${i}`}
                    className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                      check.passed
                        ? "border-emerald-100 bg-emerald-50/60"
                        : "border-red-100 bg-red-50/60"
                    }`}
                  >
                    {check.passed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                    )}
                    <span
                      className={
                        check.passed
                          ? "text-emerald-700"
                          : "text-red-700"
                      }
                    >
                      <span className="font-medium">{check.name}:</span>{" "}
                      {check.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ ALT BUTONLAR ═══════ */}
      {pattern && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <button
            onClick={handleSave}
            disabled={saving || !!savedId}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${
              savedId
                ? "bg-emerald-600 text-white"
                : "bg-[#1A1A1A] text-white hover:bg-[#333]"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : savedId ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Kaydedildi
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Kalibi Kaydet
              </>
            )}
          </button>

          <button
            onClick={handleDownloadSVG}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            SVG Indir
          </button>

          <Link
            href={`/admin/pastal-planlama${savedId ? `?patternId=${savedId}` : ""}`}
          >
            <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              Pastal Planlamaya Git
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
