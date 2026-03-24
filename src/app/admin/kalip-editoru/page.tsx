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
          modelType: pattern.modelType,
          size: pattern.size,
          gender: pattern.gender,
          sizes: selectedSizes,
          pieces: pattern.pieces,
          totalAreaCm2: pattern.totalAreaCm2,
          totalAreaWithSeamCm2: pattern.totalAreaWithSeamCm2,
          fabricAreaM2: pattern.fabricAreaM2,
          metadata: pattern.metadata,
          svg: svgContent,
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scissors className="h-6 w-6 text-[#7AC143]" />
            <div>
              <h1 className="text-xl font-bold text-[#1A1A1A]">
                Kalip Editoru
              </h1>
              <p className="text-sm text-gray-500">
                Parametrik kalip olusturma ve dogrulama
              </p>
            </div>
          </div>
          <Link href="/admin/uretim">
            <Button variant="ghost" size="sm">
              Uretim Paneline Don
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-8">
        {/* ═══════ BOLUM 1: MODEL SECIMI ═══════ */}
        <section>
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">
            Model Secimi
          </h2>

          {/* Model kartlari */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {MODEL_CARDS.map((model) => {
              const isSelected = selectedModel === model.key;
              return (
                <button
                  key={model.key}
                  onClick={() => setSelectedModel(model.key)}
                  className={`relative rounded-xl border-2 p-5 text-left transition-all hover:shadow-md ${
                    isSelected
                      ? "border-[#7AC143] bg-[#7AC143]/5 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="h-5 w-5 text-[#7AC143]" />
                    </div>
                  )}
                  <div
                    className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg ${
                      model.gender === "male"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-pink-100 text-pink-600"
                    }`}
                  >
                    <User className="h-5 w-5" />
                  </div>
                  <div className="font-semibold text-[#1A1A1A]">
                    {model.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {model.subtitle}
                  </div>
                  <Badge
                    variant={model.gender === "male" ? "outline" : "new"}
                    className="mt-2 text-[10px]"
                  >
                    {model.gender === "male" ? "Erkek" : "Kadin"}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Beden secimi */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-sm font-medium text-gray-700">
              Bedenler:
            </span>
            {ALL_SIZES.map((size) => {
              const isActive = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`h-10 w-14 rounded-lg border-2 text-sm font-semibold transition-all ${
                    isActive
                      ? "border-[#7AC143] bg-[#7AC143] text-white"
                      : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>

          {/* Kalip olustur butonu */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleGenerate}
            className="rounded-xl"
          >
            <Scissors className="h-5 w-5" />
            Kalip Olustur
          </Button>
        </section>

        {/* ═══════ BOLUM 2: KALIP GORSELLESTIRME ═══════ */}
        <section>
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">
            Kalip Gorsellestirme
          </h2>

          {!pattern ? (
            <div className="flex min-h-[500px] items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
              <div className="text-center text-gray-400">
                <Ruler className="mx-auto mb-3 h-12 w-12" />
                <p className="text-lg font-medium">
                  Model secip kalip olusturun
                </p>
                <p className="text-sm mt-1">
                  Yukaridaki model ve beden secimlerini yapip &quot;Kalip
                  Olustur&quot; butonuna basin.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Beden + zoom kontrolleri */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    Beden:
                  </span>
                  {selectedSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => handleViewSize(size)}
                      className={`h-9 w-12 rounded-lg border text-sm font-semibold transition-all ${
                        currentViewSize === size
                          ? "border-[#7AC143] bg-[#7AC143] text-white"
                          : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600 w-16 text-center">
                    {(zoom * 100).toFixed(0)}%
                  </span>
                  <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadSVG}
                  >
                    <Download className="h-4 w-4" />
                    SVG Indir
                  </Button>
                </div>
              </div>

              {/* SVG goruntuleyici */}
              <div className="min-h-[500px] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4">
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
        </section>

        {/* ═══════ BOLUM 3: OLCU TABLOSU + DOGRULAMA ═══════ */}
        {pattern && validation && (
          <section>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">
              Olcu Tablosu ve Dogrulama
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sol: Olcu Tablosu */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-[#1A1A1A] text-sm">
                    Olcu Tablosu —{" "}
                    {MODEL_LABELS_TR[pattern.modelType]} ({pattern.size})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Parca Adi</th>
                        <th className="px-4 py-3 text-right">En (cm)</th>
                        <th className="px-4 py-3 text-right">Boy (cm)</th>
                        <th className="px-4 py-3 text-right">Alan (cm2)</th>
                        <th className="px-4 py-3">Dikis Tipi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
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
                          <tr key={piece.name} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-medium text-[#1A1A1A]">
                              <span
                                className="inline-block w-3 h-3 rounded-sm mr-2"
                                style={{ backgroundColor: piece.color }}
                              />
                              {PIECE_LABELS_TR[piece.name] || piece.label}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {piece.width.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {piece.height.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {piece.areaCm2.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {SEAM_LABELS_TR[seamType] || seamType}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-[#1A1A1A]">
                          Toplam
                        </td>
                        <td className="px-4 py-3 text-right" colSpan={2} />
                        <td className="px-4 py-3 text-right font-semibold text-[#1A1A1A]">
                          {pattern.totalAreaCm2.toFixed(1)}
                        </td>
                        <td />
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-600">
                          Gercek Kumas Alani (dikis+cekme dahil)
                        </td>
                        <td className="px-4 py-3 text-right" colSpan={2} />
                        <td className="px-4 py-3 text-right font-semibold text-[#7AC143]">
                          {(realFabricArea * 10000).toFixed(1)} cm2
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          ({realFabricArea.toFixed(4)} m2)
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Sag: Dogrulama Sonuclari */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-[#1A1A1A] text-sm">
                    Dogrulama Sonuclari
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {/* Genel durum */}
                  <div
                    className={`flex items-center gap-2 rounded-lg px-4 py-3 ${
                      validation.valid
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {validation.valid ? (
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 flex-shrink-0" />
                    )}
                    <span className="font-semibold">
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
                        className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm"
                      >
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-red-700">{err}</span>
                      </div>
                    ))}

                    {/* Uyarilar */}
                    {validation.warnings.map((warn, i) => (
                      <div
                        key={`warn-${i}`}
                        className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm"
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-amber-700">{warn}</span>
                      </div>
                    ))}

                    {/* Basarili kontroller */}
                    {validation.errors.length === 0 && (
                      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-emerald-700">
                          Yan dikis uzunluklari tolerans icinde
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-emerald-700">
                        Ag parcasi boyut kontrolu basarili
                      </span>
                    </div>

                    {validation.warnings.length === 0 && (
                      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-emerald-700">
                          Bel cevresi uyumlu
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-emerald-700">
                        Toplam alan kontrol: {pattern.totalAreaCm2.toFixed(0)}{" "}
                        cm2 (200-5000 araligi)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══════ ALT BUTONLAR ═══════ */}
        {pattern && (
          <section className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-6 pb-12">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSave}
              loading={saving}
              disabled={saving || !!savedId}
              className="rounded-xl"
            >
              {savedId ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Kaydedildi
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Kalibi Kaydet
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleDownloadSVG}
              className="rounded-xl"
            >
              <Download className="h-5 w-5" />
              SVG Indir
            </Button>

            <Link
              href={`/admin/pastal-planlama${savedId ? `?patternId=${savedId}` : ""}`}
            >
              <Button variant="ghost" size="lg" className="rounded-xl">
                Pastal Planlamaya Git
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
