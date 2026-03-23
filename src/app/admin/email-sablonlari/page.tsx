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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const DEFAULT_TEMPLATES = [
  { name: "order-confirmation", label: "Sipariş Onayı", vars: "customerName, orderNumber, totalAmount, items", from: "siparis@vorte.com.tr" },
  { name: "payment-success", label: "Ödeme Başarılı", vars: "customerName, orderNumber, amount", from: "siparis@vorte.com.tr" },
  { name: "shipping-notification", label: "Kargoya Verildi", vars: "customerName, orderNumber, trackingNo, cargoProvider", from: "siparis@vorte.com.tr" },
  { name: "delivery-notification", label: "Teslim Edildi", vars: "customerName, orderNumber", from: "siparis@vorte.com.tr" },
  { name: "refund-confirmation", label: "İade Onayı", vars: "customerName, orderNumber, refundAmount", from: "destek@vorte.com.tr" },
  { name: "invoice", label: "Fatura", vars: "orderNumber, invoiceNo", from: "fatura@vorte.com.tr" },
  { name: "welcome", label: "Hoş Geldiniz", vars: "customerName", from: "info@vorte.com.tr" },
  { name: "password-reset", label: "Şifre Sıfırlama", vars: "customerName, resetUrl", from: "destek@vorte.com.tr" },
  { name: "dealer-approved", label: "Bayi Onayı", vars: "companyName, dealerCode, loginUrl", from: "bayi@vorte.com.tr" },
  { name: "newsletter", label: "Bülten", vars: "content", from: "info@vorte.com.tr" },
  { name: "production-termin", label: "Üretim Termin Bildirimi", vars: "companyName, orderNumber, terminDate, totalAmount, productionNote", from: "bayi@vorte.com.tr" },
  { name: "supplier-quote-request", label: "Tedarikçi Teklif Talebi", vars: "supplierName, categoryName, productDetails, quantity", from: "info@vorte.com.tr" },
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
  };

  const startCreate = (name: string) => {
    const def = DEFAULT_TEMPLATES.find((t) => t.name === name);
    setEditing(name);
    setForm({
      subject: `[Vorte] ${def?.label || name}`,
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2>${def?.label || name}</h2>\n  <p>İçerik buraya gelecek.</p>\n  <p>Değişkenler: ${def?.vars || ""}</p>\n</div>`,
      active: true,
    });
    setPreviewHtml(null);
    setTestResult(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const def = DEFAULT_TEMPLATES.find((t) => t.name === editing);
    try {
      await fetch("/api/admin/email-templates", {
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
      await fetchTemplates();
      setEditing(null);
    } catch { /* silent */ }
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
        ? { ok: true, msg: "Test e-postası gönderildi!" }
        : { ok: false, msg: data.error || "Gönderilemedi" }
      );
    } catch {
      setTestResult({ ok: false, msg: "Bağlantı hatası" });
    }
    setTestSending(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu şablonu silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/admin/email-templates/${id}`, { method: "DELETE" });
      await fetchTemplates();
    } catch { /* silent */ }
  };

  const existingMap = new Map(templates.map((t) => [t.name, t]));

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">E-posta Şablonları</h1>
        <p className="mt-1 text-sm text-gray-500">
          Otomatik gönderilen e-postaların içeriklerini düzenleyin. Şablonlar gerçek e-postalarda kullanılır.
        </p>
      </div>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
        </div>
      ) : editing ? (
        /* Edit Form */
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {DEFAULT_TEMPLATES.find((t) => t.name === editing)?.label || editing}
              </h2>
              <p className="text-xs text-gray-500">
                Gönderen: {DEFAULT_TEMPLATES.find((t) => t.name === editing)?.from || "info@vorte.com.tr"}
              </p>
            </div>
            <button onClick={() => { setEditing(null); setPreviewHtml(null); setTestResult(null); }} className="text-sm text-gray-500 hover:text-gray-700">
              ← Geri
            </button>
          </div>

          <div className="rounded-lg border bg-white p-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Konu Satırı</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">HTML İçerik</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={15}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-[#7AC143] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="rounded"
                />
                Aktif
              </label>
              <span className="text-xs text-gray-400">
                Değişkenler: {DEFAULT_TEMPLATES.find((t) => t.name === editing)?.vars || "—"}
              </span>
            </div>
          </div>

          {/* Server-side Preview with sample data */}
          {previewHtml && (
            <div className="rounded-lg border bg-white p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Önizleme (örnek verilerle)</h3>
                <button onClick={() => setPreviewHtml(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="rounded border p-4" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          )}

          {/* Test Email */}
          <div className="rounded-lg border bg-white p-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700">Test E-postası Gönder</h3>
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestSend}
                disabled={testSending || !testEmail}
              >
                <Send className="mr-1.5 h-4 w-4" />
                {testSending ? "Gönderiliyor..." : "Gönder"}
              </Button>
            </div>
            {testResult && (
              <p className={`mt-2 text-xs ${testResult.ok ? "text-green-600" : "text-red-600"}`}>
                {testResult.msg}
              </p>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewLoading}>
              <Eye className="mr-1.5 h-4 w-4" />
              {previewLoading ? "Yükleniyor..." : "Önizle (Örnek Veri)"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditing(null); setPreviewHtml(null); setTestResult(null); }}>
                İptal
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="mr-1.5 h-4 w-4" />
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Template List */
        <div className="mt-6 grid gap-3">
          {DEFAULT_TEMPLATES.map((def) => {
            const existing = existingMap.get(def.name);
            return (
              <div key={def.name} className="flex items-center justify-between rounded-lg border bg-white p-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{def.label}</p>
                    <p className="text-xs text-gray-500">
                      {existing ? existing.subject : "Henüz oluşturulmadı"}
                    </p>
                    <p className="text-[11px] text-gray-400">{def.from}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {existing ? (
                    <>
                      <Badge variant={existing.active ? "success" : "outline"}>
                        {existing.active ? "Aktif" : "Pasif"}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => startEdit(existing)}>
                        <Edit3 className="mr-1 h-3.5 w-3.5" /> Düzenle
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(existing.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => startCreate(def.name)}>
                      Oluştur
                    </Button>
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
