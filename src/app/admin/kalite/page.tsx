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

  const filteredChecks = searchTerm
    ? checks.filter(
        (c) =>
          c.productionOrder.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.inspectedBy.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : checks;

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kalite Kontrol</h1>
        <div className="mt-12 flex justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-7 w-7 text-[#7AC143]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kalite Kontrol</h1>
            <p className="text-sm text-gray-500">
              Toplam {total} kontrol kaydı
            </p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6aad38] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Yeni Kontrol
        </button>
      </div>

      {/* Messages */}
      {formError && !showModal && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{formError}</div>
      )}

      {/* Search + Filter Tabs */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Result filter tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {RESULT_TABS.map((tab) => {
            const isActive = resultFilter === tab.key;
            let tabColor = "text-gray-600 hover:text-gray-900";
            if (isActive) {
              if (tab.key === "PASSED") tabColor = "bg-green-500 text-white shadow-sm";
              else if (tab.key === "FAILED") tabColor = "bg-red-500 text-white shadow-sm";
              else if (tab.key === "PARTIAL") tabColor = "bg-yellow-500 text-white shadow-sm";
              else tabColor = "bg-white text-gray-900 shadow-sm";
            }
            return (
              <button
                key={tab.key}
                onClick={() => setResultFilter(tab.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tabColor}`}
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
            className="form-input w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-[#7AC143] focus:outline-none sm:w-72"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Üretim Emri</th>
              <th className="px-4 py-3 font-medium text-gray-700 text-right">Kontrol</th>
              <th className="px-4 py-3 font-medium text-gray-700 text-right">Geçen</th>
              <th className="px-4 py-3 font-medium text-gray-700 text-right">Hatalı</th>
              <th className="px-4 py-3 font-medium text-gray-700 text-right">Başarı %</th>
              <th className="px-4 py-3 font-medium text-gray-700">Sonuç</th>
              <th className="px-4 py-3 font-medium text-gray-700">Kontrol Eden</th>
              <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
              <th className="px-4 py-3 font-medium text-gray-700">Not</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredChecks.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  <ClipboardCheck className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2">Kalite kontrol kaydı bulunamadı.</p>
                </td>
              </tr>
            ) : (
              filteredChecks.map((check) => {
                const rate = getPassRate(check.inspectedQuantity, check.passedQuantity);
                const rateColor = getPassRateColor(rate);
                const resultInfo = RESULT_MAP[check.result] || RESULT_MAP.PASSED;
                const ResultIcon = resultInfo.icon;

                return (
                  <tr key={check.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/uretim/${check.productionOrderId}`}
                        className="font-medium text-[#7AC143] hover:underline"
                      >
                        {check.productionOrder.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {check.inspectedQuantity.toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {check.passedQuantity.toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {check.defectQuantity.toLocaleString("tr-TR")}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${rateColor}`}>
                      %{rate.toFixed(1)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${resultInfo.color}`}
                      >
                        <ResultIcon className="h-3.5 w-3.5" />
                        {resultInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{check.inspectedBy}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(check.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                      {check.defectNotes || check.notes || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New Quality Check Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900">Yeni Kalite Kontrol</h2>
            <p className="mt-1 text-sm text-gray-500">
              Üretim emri için kalite kontrol kaydı oluşturun.
            </p>

            {/* Form messages */}
            {formError && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{formError}</div>
            )}
            {formSuccess && (
              <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-600">{formSuccess}</div>
            )}

            <div className="mt-4 space-y-4">
              {/* Production Order Select */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Hash className="h-4 w-4 text-gray-400" />
                  Üretim Emri
                </label>
                <select
                  value={formProductionOrderId}
                  onChange={(e) => setFormProductionOrderId(e.target.value)}
                  className="form-input w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none"
                >
                  <option value="">Üretim emri seçiniz...</option>
                  {productionOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} — {o.stage}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Kontrol Edilen
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formInspectedQty}
                    onChange={(e) => setFormInspectedQty(parseInt(e.target.value) || 0)}
                    className="form-input w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Geçen Miktar
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={formInspectedQty}
                    value={formPassedQty}
                    onChange={(e) => setFormPassedQty(parseInt(e.target.value) || 0)}
                    className="form-input w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Hatalı (Otomatik)
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={defectQty < 0 ? 0 : defectQty}
                    className="form-input w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500"
                  />
                </div>
              </div>

              {/* Result Select */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <CheckSquare className="h-4 w-4 text-gray-400" />
                  Sonuç
                </label>
                <select
                  value={formResult}
                  onChange={(e) => setFormResult(e.target.value as "PASSED" | "FAILED" | "PARTIAL")}
                  className="form-input w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none"
                >
                  <option value="PASSED">Geçti</option>
                  <option value="FAILED">Kaldı</option>
                  <option value="PARTIAL">Kısmi Geçti</option>
                </select>
              </div>

              {/* Inspector */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <User className="h-4 w-4 text-gray-400" />
                  Kontrol Eden
                </label>
                <input
                  type="text"
                  value={formInspectedBy}
                  onChange={(e) => setFormInspectedBy(e.target.value)}
                  placeholder="Adı Soyadı"
                  className="form-input w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none"
                />
              </div>

              {/* Defect Notes */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <AlertTriangle className="h-4 w-4 text-gray-400" />
                  Hata Notları
                </label>
                <textarea
                  value={formDefectNotes}
                  onChange={(e) => setFormDefectNotes(e.target.value)}
                  placeholder="Tespit edilen hataları açıklayınız..."
                  rows={2}
                  className="form-input w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none resize-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <FileText className="h-4 w-4 text-gray-400" />
                  Genel Not (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ek notlar..."
                  className="form-input w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6aad38] disabled:opacity-50 transition-colors"
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
