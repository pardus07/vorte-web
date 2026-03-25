"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Save,
  Eye,
  Edit3,
  Send,
  Trash2,
  X,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const DEFAULT_TEMPLATES = [
  { name: "order-confirmation", label: "Siparis Onayi", vars: "customerName, orderNumber, totalAmount, items", from: "siparis@vorte.com.tr" },
  { name: "payment-success", label: "Odeme Basarili", vars: "customerName, orderNumber, amount", from: "siparis@vorte.com.tr" },
  { name: "shipping-notification", label: "Kargoya Verildi", vars: "customerName, orderNumber, trackingNo, cargoProvider", from: "siparis@vorte.com.tr" },
  { name: "delivery-notification", label: "Teslim Edildi", vars: "customerName, orderNumber", from: "siparis@vorte.com.tr" },
  { name: "refund-confirmation", label: "Iade Onayi", vars: "customerName, orderNumber, refundAmount", from: "destek@vorte.com.tr" },
  { name: "invoice", label: "Fatura", vars: "orderNumber, invoiceNo", from: "fatura@vorte.com.tr" },
  { name: "welcome", label: "Hos Geldiniz", vars: "customerName", from: "info@vorte.com.tr" },
  { name: "password-reset", label: "Sifre Sifirlama", vars: "customerName, resetUrl", from: "destek@vorte.com.tr" },
  { name: "dealer-approved", label: "Bayi Onayi", vars: "companyName, dealerCode, loginUrl", from: "bayi@vorte.com.tr" },
  { name: "newsletter", label: "Bulten", vars: "content", from: "info@vorte.com.tr" },
  { name: "production-termin", label: "Uretim Termin Bildirimi", vars: "companyName, orderNumber, terminDate, totalAmount, productionNote", from: "bayi@vorte.com.tr" },
  { name: "supplier-quote-request", label: "Tedarikci Teklif Talebi", vars: "supplierName, categoryName, productDetails, quantity", from: "info@vorte.com.tr" },
];

interface TemplateData {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string | null;
  fromAddress: string | null;
  description: string | null;
  active: boolean;
}

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", body: "", active: true });
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates");
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const startEdit = (tmpl: TemplateData) => {
    setEditing(tmpl.name);
    setForm({ subject: tmpl.subject, body: tmpl.body, active: tmpl.active });
    setPreviewHtml(null);
    setTestResult(null);
    setSaveResult(null);
  };

  const startCreate = (name: string) => {
    const def = DEFAULT_TEMPLATES.find((t) => t.name === name);
    setEditing(name);
    setForm({
      subject: `[Vorte] ${def?.label || name}`,
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2>${def?.label || name}</h2>\n  <p>Icerik buraya gelecek.</p>\n  <p>Degiskenler: ${def?.vars || ""}</p>\n</div>`,
      active: true,
    });
    setPreviewHtml(null);
    setTestResult(null);
    setSaveResult(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveResult(null);
    const def = DEFAULT_TEMPLATES.find((t) => t.name === editing);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing,
          subject: form.subject,
          body: form.body,
          variables: def?.vars || null,
          active: form.active,
          fromAddress: def?.from || null,
        }),
      });
      if (res.ok) {
        setSaveResult({ ok: true, msg: "Sablon basariyla kaydedildi." });
        await fetchTemplates();
        setTimeout(() => {
          setEditing(null);
          setSaveResult(null);
        }, 1200);
      } else {
        setSaveResult({ ok: false, msg: "Kaydetme sirasinda bir hata olustu." });
      }
    } catch {
      setSaveResult({ ok: false, msg: "Baglanti hatasi." });
    }
    setSaving(false);
  };

  const handlePreview = async () => {
    if (!editing) return;
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateName: editing }),
      });
      const data = await res.json();
      if (data.html) {
        setPreviewHtml(data.html);
      }
    } catch { /* silent */ }
    setPreviewLoading(false);
  };

  const handleTestSend = async () => {
    if (!editing || !testEmail) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email-templates/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateName: editing, to: testEmail }),
      });
      const data = await res.json();
      setTestResult(data.success
        ? { ok: true, msg: "Test e-postasi gonderildi!" }
        : { ok: false, msg: data.error || "Gonderilemedi" }
      );
    } catch {
      setTestResult({ ok: false, msg: "Baglanti hatasi" });
    }
    setTestSending(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu sablonu silmek istediginize emin misiniz?")) return;
    try {
      await fetch(`/api/admin/email-templates/${id}`, { method: "DELETE" });
      await fetchTemplates();
    } catch { /* silent */ }
  };

  const exitEdit = () => {
    setEditing(null);
    setPreviewHtml(null);
    setTestResult(null);
    setSaveResult(null);
  };

  const existingMap = new Map(templates.map((t) => [t.name, t]));

  const currentDef = editing
    ? DEFAULT_TEMPLATES.find((t) => t.name === editing)
    : null;

  const variableList = currentDef?.vars
    ? currentDef.vars.split(",").map((v) => v.trim())
    : [];

  /* Color mapping for template icons */
  const getTemplateColor = (name: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      "order-confirmation": { bg: "bg-emerald-50", text: "text-emerald-600" },
      "payment-success": { bg: "bg-green-50", text: "text-green-600" },
      "shipping-notification": { bg: "bg-sky-50", text: "text-sky-600" },
      "delivery-notification": { bg: "bg-teal-50", text: "text-teal-600" },
      "refund-confirmation": { bg: "bg-orange-50", text: "text-orange-600" },
      "invoice": { bg: "bg-violet-50", text: "text-violet-600" },
      "welcome": { bg: "bg-pink-50", text: "text-pink-600" },
      "password-reset": { bg: "bg-amber-50", text: "text-amber-600" },
      "dealer-approved": { bg: "bg-indigo-50", text: "text-indigo-600" },
      "newsletter": { bg: "bg-cyan-50", text: "text-cyan-600" },
      "production-termin": { bg: "bg-rose-50", text: "text-rose-600" },
      "supplier-quote-request": { bg: "bg-purple-50", text: "text-purple-600" },
    };
    return colors[name] || { bg: "bg-blue-50", text: "text-blue-600" };
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            E-posta Sablonlari
          </h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Otomatik gonderilen e-postalarin iceriklerini duzenleyin. Sablonlar gercek e-postalarda kullanilir.
          </p>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#7AC143]" />
            <p className="text-sm text-gray-400">Sablonlar yukleniyor...</p>
          </div>
        </div>
      ) : editing ? (
        /* ── Edit View ── */
        <div className="space-y-5">
          {/* Back button + template info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={exitEdit}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-gray-900">
                  {currentDef?.label || editing}
                </h2>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="rounded-lg bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-600">
                    {currentDef?.from || "info@vorte.com.tr"}
                  </span>
                  {variableList.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {variableList.map((v) => (
                        <span
                          key={v}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600"
                        >
                          {`{${v}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Save result message */}
          {saveResult && (
            <div
              className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                saveResult.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {saveResult.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {saveResult.msg}
            </div>
          )}

          {/* Edit form card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="space-y-5">
              {/* Subject */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Konu Satiri
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                />
              </div>

              {/* HTML Body */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  HTML Icerik
                </label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={16}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-mono text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                />
              </div>

              {/* Active toggle + variable hint */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <label className="flex items-center gap-2.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-[#7AC143] focus:ring-[#7AC143]/30"
                  />
                  <span className="font-medium">Aktif</span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        form.active ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    />
                    <span className="text-[11px] text-gray-400">
                      {form.active ? "E-posta gonderilecek" : "E-posta gonderilmeyecek"}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Action buttons row */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={previewLoading}
            >
              {previewLoading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-1.5 h-4 w-4" />
              )}
              {previewLoading ? "Yukleniyor..." : "Onizle (Ornek Veri)"}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={exitEdit}>
                Iptal
              </Button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333333] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>

          {/* Preview section */}
          {previewHtml && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Onizleme (ornek verilerle)
                </h3>
                <button
                  onClick={() => setPreviewHtml(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <iframe
                  srcDoc={previewHtml}
                  title="E-posta onizlemesi"
                  className="h-[400px] w-full border-0 bg-white"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}

          {/* Test email section */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Test E-postasi Gonder
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestSend}
                disabled={testSending || !testEmail}
              >
                {testSending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-4 w-4" />
                )}
                {testSending ? "Gonderiliyor..." : "Gonder"}
              </Button>
            </div>
            {testResult && (
              <div
                className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                  testResult.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                {testResult.msg}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Template List ── */
        <div className="grid gap-3">
          {DEFAULT_TEMPLATES.map((def) => {
            const existing = existingMap.get(def.name);
            const color = getTemplateColor(def.name);
            const vars = def.vars.split(",").map((v) => v.trim());

            return (
              <div
                key={def.name}
                className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Left: icon + info */}
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color.bg}`}
                  >
                    <Mail className={`h-5 w-5 ${color.text}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="font-medium text-gray-900">{def.label}</p>
                      {existing && (
                        <span className="flex items-center gap-1">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              existing.active ? "bg-emerald-500" : "bg-gray-300"
                            }`}
                          />
                          <span className="text-[11px] text-gray-400">
                            {existing.active ? "Aktif" : "Pasif"}
                          </span>
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[13px] text-gray-500">
                      {existing ? existing.subject : "Henuz olusturulmadi"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-lg bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-500">
                        {def.from}
                      </span>
                      {vars.slice(0, 4).map((v) => (
                        <span
                          key={v}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600"
                        >
                          {v}
                        </span>
                      ))}
                      {vars.length > 4 && (
                        <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-400">
                          +{vars.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex shrink-0 items-center gap-2">
                  {existing ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(existing)}
                      >
                        <Edit3 className="mr-1 h-3.5 w-3.5" />
                        Duzenle
                      </Button>
                      <button
                        onClick={() => handleDelete(existing.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-400 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startCreate(def.name)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333333]"
                    >
                      Olustur
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
