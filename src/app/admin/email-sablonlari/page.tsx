"use client";

import { useEffect, useState } from "react";
import { Mail, Save, Eye, Edit3, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const DEFAULT_TEMPLATES = [
  { name: "order-confirmation", label: "Sipariş Onayı", vars: "customerName, orderNumber, totalAmount, items" },
  { name: "shipping-notification", label: "Kargoya Verildi", vars: "customerName, orderNumber, trackingNo, cargoProvider" },
  { name: "delivery-notification", label: "Teslim Edildi", vars: "customerName, orderNumber" },
  { name: "refund-confirmation", label: "İade Onayı", vars: "customerName, orderNumber, refundAmount" },
  { name: "welcome", label: "Hoş Geldiniz", vars: "customerName" },
  { name: "password-reset", label: "Şifre Sıfırlama", vars: "customerName, resetLink" },
  { name: "dealer-approved", label: "Bayi Onayı", vars: "companyName, dealerCode, loginUrl" },
  { name: "newsletter", label: "Bülten", vars: "content" },
];

interface TemplateData {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string | null;
  active: boolean;
}

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", body: "", active: true });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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
    setPreview(null);
  };

  const startCreate = (name: string) => {
    const def = DEFAULT_TEMPLATES.find((t) => t.name === name);
    setEditing(name);
    setForm({
      subject: `[Vorte] ${def?.label || name}`,
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2>${def?.label || name}</h2>\n  <p>İçerik buraya gelecek.</p>\n  <p>Değişkenler: ${def?.vars || ""}</p>\n</div>`,
      active: true,
    });
    setPreview(null);
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
        }),
      });
      await fetchTemplates();
      setEditing(null);
    } catch { /* silent */ }
    setSaving(false);
  };

  const existingMap = new Map(templates.map((t) => [t.name, t]));

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">E-posta Şablonları</h1>
        <p className="mt-1 text-sm text-gray-500">
          Otomatik gönderilen e-postaların içeriklerini düzenleyin
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
            <h2 className="text-lg font-semibold text-gray-900">
              {DEFAULT_TEMPLATES.find((t) => t.name === editing)?.label || editing}
            </h2>
            <button onClick={() => setEditing(null)} className="text-sm text-gray-500 hover:text-gray-700">← Geri</button>
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

          {/* Preview */}
          {preview && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-3 text-sm font-medium text-gray-700">Önizleme</h3>
              <div className="rounded border p-4" dangerouslySetInnerHTML={{ __html: form.body }} />
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setPreview(preview ? null : "show")}>
              <Eye className="mr-1.5 h-4 w-4" />
              {preview ? "Önizlemeyi Kapat" : "Önizleme"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>İptal</Button>
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
