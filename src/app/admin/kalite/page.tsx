"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  XCircle,
  AlertTriangle,
  Plus,
  Search,
  ClipboardCheck,
  X,
  Loader2,
  User,
  Calendar,
  FileText,
  Hash,
} from "lucide-react";

interface ProductionOrder {
  id: string;
  orderNumber: string;
  stage: string;
}

interface QualityCheck {
  id: string;
  productionOrderId: string;
  productionOrder: {
    orderNumber: string;
    stage: string;
  };
  inspectedQuantity: number;
  passedQuantity: number;
  defectQuantity: number;
  result: "PASSED" | "FAILED" | "PARTIAL";
  defectNotes: string | null;
  notes: string | null;
  inspectedBy: string;
  createdAt: string;
}

const RESULT_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PASSED: { label: "Geçti", color: "bg-green-100 text-green-700", icon: CheckSquare },
  FAILED: { label: "Kaldı", color: "bg-red-100 text-red-700", icon: XCircle },
  PARTIAL: { label: "Kısmi", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
};

const RESULT_TABS = [
  { key: "", label: "Tümü" },
  { key: "PASSED", label: "Geçti" },
  { key: "FAILED", label: "Kaldı" },
  { key: "PARTIAL", label: "Kısmi" },
];

export default function AdminKalitePage() {
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Form fields
  const [formProductionOrderId, setFormProductionOrderId] = useState("");
  const [formInspectedQty, setFormInspectedQty] = useState<number>(0);
  const [formPassedQty, setFormPassedQty] = useState<number>(0);
  const [formResult, setFormResult] = useState<"PASSED" | "FAILED" | "PARTIAL">("PASSED");
  const [formDefectNotes, setFormDefectNotes] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formInspectedBy, setFormInspectedBy] = useState("");

  const defectQty = formInspectedQty - formPassedQty;

  const fetchChecks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (resultFilter) params.set("result", resultFilter);
      const res = await fetch(`/api/admin/quality?${params.toString()}`);
      const data = await res.json();
      setChecks(data.checks || []);
      setTotal(data.total || 0);
    } catch {
      // silent
    }
    setLoading(false);
  }, [resultFilter]);

  const fetchProductionOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/production-full");
      const data = await res.json();
      setProductionOrders(
        (data.orders || []).map((o: ProductionOrder) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          stage: o.stage,
        }))
      );
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  const openModal = () => {
    setFormProductionOrderId("");
    setFormInspectedQty(0);
    setFormPassedQty(0);
    setFormResult("PASSED");
    setFormDefectNotes("");
    setFormNotes("");
    setFormInspectedBy("");
    setFormError("");
    setFormSuccess("");
    fetchProductionOrders();
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formProductionOrderId) {
      setFormError("Üretim emri seçiniz.");
      return;
    }
    if (formInspectedQty <= 0) {
      setFormError("Kontrol edilen miktar 0'dan büyük olmalı.");
      return;
    }
    if (formPassedQty > formInspectedQty) {
      setFormError("Geçen miktar kontrol edilenden fazla olamaz.");
      return;
    }
    if (!formInspectedBy.trim()) {
      setFormError("Kontrol eden kişi adını giriniz.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/admin/quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionOrderId: formProductionOrderId,
          inspectedQuantity: formInspectedQty,
          passedQuantity: formPassedQty,
          defectQuantity: defectQty < 0 ? 0 : defectQty,
          result: formResult,
          defectNotes: formDefectNotes || undefined,
          notes: formNotes || undefined,
          inspectedBy: formInspectedBy.trim(),
        }),
      });

      if (res.ok) {
        setFormSuccess("Kalite kontrol kaydı oluşturuldu.");
        fetchChecks();
        setTimeout(() => {
          setShowModal(false);
          setFormSuccess("");
        }, 1200);
      } else {
        const data = await res.json();
        setFormError(data.error || "Kaydetme başarısız oldu.");
      }
    } catch {
      setFormError("Bir hata oluştu.");
    }
    setSaving(false);
  };

  const getPassRate = (inspected: number, passed: number) => {
    if (inspected === 0) return 0;
    return (passed / inspected) * 100;
  };

  const getPassRateColor = (rate: number) => {
    if (rate >= 95) return "text-green-600";
    if (rate >= 80) return "text-orange-500";
    return "text-red-600";
  };

  const getPassRateBarColor = (rate: number) => {
    if (rate >= 95) return "bg-green-500";
    if (rate >= 80) return "bg-orange-400";
    return "bg-red-500";
  };

  const filteredChecks = searchTerm
    ? checks.filter(
        (c) =>
          c.productionOrder.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.inspectedBy.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : checks;

  /* ---- Stat computations ---- */
  const statTotal = checks.length;
  const statPassed = checks.filter((c) => c.result === "PASSED").length;
  const statFailed = checks.filter((c) => c.result === "FAILED").length;
  const statPartial = checks.filter((c) => c.result === "PARTIAL").length;

  /* ---- Loading State ---- */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
          <p className="text-sm text-gray-500">Kalite kontrol verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7AC143]/10">
            <ClipboardCheck className="h-5.5 w-5.5 text-[#7AC143]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Kalite Kontrol</h1>
            <p className="text-[13px] text-gray-500">
              Toplam {total} kontrol kaydı
            </p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333]"
        >
          <Plus className="h-4 w-4" />
          Yeni Kontrol
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Toplam Kontrol */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-gray-500">Toplam Kontrol</p>
              <p className="text-xl font-bold text-gray-900">{statTotal}</p>
            </div>
          </div>
        </div>
        {/* Geçti */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <CheckSquare className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-gray-500">Geçti</p>
              <p className="text-xl font-bold text-gray-900">{statPassed}</p>
            </div>
          </div>
        </div>
        {/* Kaldı */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-gray-500">Kaldı</p>
              <p className="text-xl font-bold text-gray-900">{statFailed}</p>
            </div>
          </div>
        </div>
        {/* Kısmi */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-gray-500">Kısmi</p>
              <p className="text-xl font-bold text-gray-900">{statPartial}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      {formError && !showModal && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{formError}</div>
      )}

      {/* ── Search + Filter Tabs ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Result filter tabs */}
        <div className="flex gap-1 rounded-2xl bg-gray-100/80 p-1">
          {RESULT_TABS.map((tab) => {
            const isActive = resultFilter === tab.key;
            let tabClasses = "text-gray-500 hover:text-gray-900";
            if (isActive) {
              if (tab.key === "PASSED") tabClasses = "bg-green-500 text-white shadow-sm";
              else if (tab.key === "FAILED") tabClasses = "bg-red-500 text-white shadow-sm";
              else if (tab.key === "PARTIAL") tabClasses = "bg-amber-500 text-white shadow-sm";
              else tabClasses = "bg-white text-gray-900 shadow-sm";
            }
            return (
              <button
                key={tab.key}
                onClick={() => setResultFilter(tab.key)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${tabClasses}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Sipariş no veya kontrol eden ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 sm:w-72"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50/80">
            <tr>
              <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Üretim Emri</th>
              <th className="px-4 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Kontrol</th>
              <th className="px-4 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Geçen</th>
              <th className="px-4 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Hatalı</th>
              <th className="px-4 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Başarı %</th>
              <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Sonuç</th>
              <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Kontrol Eden</th>
              <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Tarih</th>
              <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Not</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredChecks.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                      <ClipboardCheck className="h-7 w-7 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Kalite kontrol kaydı bulunamadı</p>
                      <p className="mt-0.5 text-[13px] text-gray-400">
                        {searchTerm ? "Arama kriterlerinizi değiştirmeyi deneyin." : "Yeni bir kontrol kaydı ekleyerek başlayın."}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredChecks.map((check) => {
                const rate = getPassRate(check.inspectedQuantity, check.passedQuantity);
                const rateColor = getPassRateColor(rate);
                const rateBarColor = getPassRateBarColor(rate);
                const resultInfo = RESULT_MAP[check.result] || RESULT_MAP.PASSED;
                const ResultIcon = resultInfo.icon;

                return (
                  <tr key={check.id} className="transition-colors hover:bg-gray-50/60">
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/uretim/${check.productionOrderId}`}
                        className="font-medium text-[#7AC143] hover:underline"
                      >
                        {check.productionOrder.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-gray-700">
                      {check.inspectedQuantity.toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-gray-700">
                      {check.passedQuantity.toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-gray-700">
                      {check.defectQuantity.toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${rateBarColor}`}
                            style={{ width: `${Math.min(rate, 100)}%` }}
                          />
                        </div>
                        <span className={`min-w-[3rem] text-right tabular-nums font-medium ${rateColor}`}>
                          %{rate.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${resultInfo.color}`}
                      >
                        <ResultIcon className="h-3.5 w-3.5" />
                        {resultInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{check.inspectedBy}</td>
                    <td className="px-4 py-3.5 text-gray-500">
                      {new Date(check.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3.5 text-xs text-gray-500">
                      {check.defectNotes || check.notes || "\u2014"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── New Quality Check Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7AC143]/10">
                  <ClipboardCheck className="h-5 w-5 text-[#7AC143]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-gray-900">Yeni Kalite Kontrol</h2>
                  <p className="text-[13px] text-gray-500">
                    Üretim emri için kalite kontrol kaydı oluşturun.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[calc(100vh-16rem)] overflow-y-auto px-6 py-5">
              {/* Form messages */}
              {formError && (
                <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{formError}</div>
              )}
              {formSuccess && (
                <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-600">{formSuccess}</div>
              )}

              <div className="space-y-5">
                {/* ── Section: Üretim Bilgileri ── */}
                <div className="space-y-4">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Üretim Bilgileri</p>

                  {/* Production Order Select */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <Hash className="h-4 w-4 text-gray-400" />
                      Üretim Emri
                    </label>
                    <select
                      value={formProductionOrderId}
                      onChange={(e) => setFormProductionOrderId(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    >
                      <option value="">Üretim emri seçiniz...</option>
                      {productionOrders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.orderNumber} — {o.stage}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* ── Section: Miktar Bilgileri ── */}
                <div className="space-y-4">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Miktar Bilgileri</p>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Kontrol Edilen
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formInspectedQty}
                        onChange={(e) => setFormInspectedQty(parseInt(e.target.value) || 0)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Geçen Miktar
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={formInspectedQty}
                        value={formPassedQty}
                        onChange={(e) => setFormPassedQty(parseInt(e.target.value) || 0)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Hatalı (Otomatik)
                      </label>
                      <input
                        type="number"
                        readOnly
                        value={defectQty < 0 ? 0 : defectQty}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* ── Section: Sonuç ve Kontrol Eden ── */}
                <div className="space-y-4">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Sonuç Bilgileri</p>

                  {/* Result Select */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <CheckSquare className="h-4 w-4 text-gray-400" />
                      Sonuç
                    </label>
                    <select
                      value={formResult}
                      onChange={(e) => setFormResult(e.target.value as "PASSED" | "FAILED" | "PARTIAL")}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    >
                      <option value="PASSED">Geçti</option>
                      <option value="FAILED">Kaldı</option>
                      <option value="PARTIAL">Kısmi Geçti</option>
                    </select>
                  </div>

                  {/* Inspector */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <User className="h-4 w-4 text-gray-400" />
                      Kontrol Eden
                    </label>
                    <input
                      type="text"
                      value={formInspectedBy}
                      onChange={(e) => setFormInspectedBy(e.target.value)}
                      placeholder="Adı Soyadı"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* ── Section: Notlar ── */}
                <div className="space-y-4">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Notlar</p>

                  {/* Defect Notes */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <AlertTriangle className="h-4 w-4 text-gray-400" />
                      Hata Notları
                    </label>
                    <textarea
                      value={formDefectNotes}
                      onChange={(e) => setFormDefectNotes(e.target.value)}
                      placeholder="Tespit edilen hataları açıklayınız..."
                      rows={2}
                      className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <FileText className="h-4 w-4 text-gray-400" />
                      Genel Not (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Ek notlar..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333] disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
