"use client";

import { useState } from "react";
import {
  Settings,
  Search,
  Code,
  Bot,
  Share2,
  Mail,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

type SiteSettings = {
  id: string;
  siteName: string;
  siteDescription: string | null;
  siteUrl: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  googleVerificationCode: string | null;
  googleAnalyticsId: string | null;
  googleAdsCode: string | null;
  googleMerchantId: string | null;
  facebookPixelId: string | null;
  aiSystemPrompt: string | null;
  aiEnabled: boolean;
  aiRules: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  freeShippingThreshold: number | null;
  defaultShippingCost: number | null;
};

const tabs = [
  { id: "genel", label: "Genel Ayarlar", icon: Settings },
  { id: "seo", label: "SEO", icon: Search },
  { id: "entegrasyon", label: "Entegrasyonlar", icon: Code },
  { id: "ai", label: "AI Temsilci", icon: Bot },
  { id: "sosyal", label: "Sosyal Medya", icon: Share2 },
  { id: "email", label: "E-posta", icon: Mail },
] as const;

type TabId = (typeof tabs)[number]["id"];

function CharCounter({ value, max }: { value: string; max: number }) {
  const len = value.length;
  return (
    <span className={`text-xs ${len > max ? "text-red-500 font-medium" : "text-gray-400"}`}>
      {len}/{max}
    </span>
  );
}

export function SettingsForm({ initialData }: { initialData: SiteSettings }) {
  const [activeTab, setActiveTab] = useState<TabId>("genel");
  const [data, setData] = useState<SiteSettings>(initialData);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const update = (field: keyof SiteSettings, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Kaydetme hatası");
      }
      const updated = await res.json();
      setData(updated);
      setToast({ type: "success", message: "Ayarlar kaydedildi" });
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Bir hata oluştu" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
          <p className="mt-1 text-sm text-gray-500">Mağaza genel ayarları ve entegrasyonlar</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#7AC143] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6AAF35] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-[#7AC143] text-[#7AC143]"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "genel" && <GenelTab data={data} update={update} />}
        {activeTab === "seo" && <SeoTab data={data} update={update} />}
        {activeTab === "entegrasyon" && <EntegrasyonTab data={data} update={update} />}
        {activeTab === "ai" && <AiTab data={data} update={update} />}
        {activeTab === "sosyal" && <SosyalTab data={data} update={update} />}
        {activeTab === "email" && <EmailTab data={data} update={update} />}
      </div>
    </div>
  );
}

// ============================================================
// TAB 1: GENEL AYARLAR
// ============================================================
function GenelTab({
  data,
  update,
}: {
  data: SiteSettings;
  update: (field: keyof SiteSettings, value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Site Bilgileri */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Site Bilgileri</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Site Adı" required>
            <input
              value={data.siteName}
              onChange={(e) => update("siteName", e.target.value)}
              className="form-input"
            />
          </FormField>
          <FormField label="Site URL">
            <input
              value={data.siteUrl}
              onChange={(e) => update("siteUrl", e.target.value)}
              className="form-input"
              placeholder="https://www.vorte.com.tr"
            />
          </FormField>
          <FormField label="Site Açıklaması" className="md:col-span-2">
            <textarea
              value={data.siteDescription || ""}
              onChange={(e) => update("siteDescription", e.target.value)}
              className="form-input min-h-[80px] resize-y"
              rows={3}
            />
          </FormField>
        </div>
      </div>

      {/* İletişim Bilgileri */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">İletişim Bilgileri</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="E-posta">
            <input
              type="email"
              value={data.contactEmail || ""}
              onChange={(e) => update("contactEmail", e.target.value)}
              className="form-input"
              placeholder="info@vorte.com.tr"
            />
          </FormField>
          <FormField label="Telefon">
            <input
              value={data.contactPhone || ""}
              onChange={(e) => update("contactPhone", e.target.value)}
              className="form-input"
              placeholder="+90 5XX XXX XXXX"
            />
          </FormField>
          <FormField label="Adres" className="md:col-span-2">
            <textarea
              value={data.contactAddress || ""}
              onChange={(e) => update("contactAddress", e.target.value)}
              className="form-input min-h-[60px] resize-y"
              rows={2}
            />
          </FormField>
        </div>
      </div>

      {/* Logo & Favicon */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Logo & Favicon</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Logo URL" hint="Önerilen: 256x80px, PNG/SVG">
            <input
              value={data.logoUrl || ""}
              onChange={(e) => update("logoUrl", e.target.value)}
              className="form-input"
              placeholder="/logo.png"
            />
          </FormField>
          <FormField label="Logo (Koyu Tema)" hint="Önerilen: 256x80px, PNG/SVG">
            <input
              value={data.logoDarkUrl || ""}
              onChange={(e) => update("logoDarkUrl", e.target.value)}
              className="form-input"
              placeholder="/logo-dark.png"
            />
          </FormField>
          <FormField label="Favicon URL" hint="Önerilen: 32x32px ve 180x180px, ICO/PNG">
            <input
              value={data.faviconUrl || ""}
              onChange={(e) => update("faviconUrl", e.target.value)}
              className="form-input"
              placeholder="/favicon.ico"
            />
          </FormField>
          <FormField label="OG Image" hint="Zorunlu: 1200x630px, PNG/JPG">
            <input
              value={data.ogImageUrl || ""}
              onChange={(e) => update("ogImageUrl", e.target.value)}
              className="form-input"
              placeholder="/og-image.jpg"
            />
          </FormField>
        </div>
      </div>

      {/* Kargo */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Kargo Ayarları</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Ücretsiz Kargo Limiti (₺)">
            <input
              type="number"
              step="0.01"
              value={data.freeShippingThreshold ?? ""}
              onChange={(e) =>
                update("freeShippingThreshold", e.target.value ? Number(e.target.value) : null)
              }
              className="form-input"
              placeholder="200"
            />
          </FormField>
          <FormField label="Standart Kargo Ücreti (₺)">
            <input
              type="number"
              step="0.01"
              value={data.defaultShippingCost ?? ""}
              onChange={(e) =>
                update("defaultShippingCost", e.target.value ? Number(e.target.value) : null)
              }
              className="form-input"
              placeholder="39.90"
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 2: SEO
// ============================================================
function SeoTab({
  data,
  update,
}: {
  data: SiteSettings;
  update: (field: keyof SiteSettings, value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Ana Sayfa SEO</h2>
        <div className="space-y-4">
          <FormField
            label="Meta Title"
            trailing={<CharCounter value={data.metaTitle || ""} max={60} />}
          >
            <input
              value={data.metaTitle || ""}
              onChange={(e) => update("metaTitle", e.target.value)}
              className="form-input"
              placeholder="Vorte Tekstil | Kaliteli İç Giyim"
              maxLength={70}
            />
          </FormField>

          <FormField
            label="Meta Description"
            trailing={<CharCounter value={data.metaDescription || ""} max={160} />}
          >
            <textarea
              value={data.metaDescription || ""}
              onChange={(e) => update("metaDescription", e.target.value)}
              className="form-input min-h-[80px] resize-y"
              rows={3}
              maxLength={170}
              placeholder="Vorte Tekstil - Erkek boxer ve kadın iç giyim ürünleri..."
            />
          </FormField>

          <FormField label="Meta Keywords" hint="Virgülle ayırarak yazın">
            <input
              value={data.metaKeywords || ""}
              onChange={(e) => update("metaKeywords", e.target.value)}
              className="form-input"
              placeholder="iç giyim, erkek boxer, kadın külot, toptan"
            />
          </FormField>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Arama Motoru Doğrulama</h2>
        <FormField label="Google Search Console Doğrulama Kodu">
          <input
            value={data.googleVerificationCode || ""}
            onChange={(e) => update("googleVerificationCode", e.target.value)}
            className="form-input"
            placeholder="google-site-verification=XXXXX"
          />
        </FormField>
      </div>

      {/* SEO Preview */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Google Arama Önizleme</h2>
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
          <p className="text-lg text-blue-700 hover:underline">
            {data.metaTitle || "Vorte Tekstil | Kaliteli İç Giyim - Toptan ve Perakende"}
          </p>
          <p className="text-sm text-green-700">{data.siteUrl}</p>
          <p className="mt-1 text-sm text-gray-600">
            {data.metaDescription ||
              "Vorte Tekstil - Erkek boxer ve kadın iç giyim ürünleri. Toptan ve perakende satış."}
          </p>
        </div>
      </div>

      {/* Useful Links */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">SEO Araçları</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            📄 sitemap.xml
          </a>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            🤖 robots.txt
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 3: ENTEGRASYONLAR
// ============================================================
function EntegrasyonTab({
  data,
  update,
}: {
  data: SiteSettings;
  update: (field: keyof SiteSettings, value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Google Analytics</h2>
        <FormField label="Ölçüm ID" hint="G-XXXXXXXXXX formatında">
          <input
            value={data.googleAnalyticsId || ""}
            onChange={(e) => update("googleAnalyticsId", e.target.value)}
            className="form-input"
            placeholder="G-XXXXXXXXXX"
          />
        </FormField>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Google Ads</h2>
        <FormField label="Dönüşüm Kodu" hint="<head> ve <body> kodlarını buraya yapıştırın">
          <textarea
            value={data.googleAdsCode || ""}
            onChange={(e) => update("googleAdsCode", e.target.value)}
            className="form-input min-h-[120px] resize-y font-mono text-xs"
            rows={5}
            placeholder="<!-- Google Ads kodu -->"
          />
        </FormField>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Google Merchant Center</h2>
        <FormField label="Merchant Center ID">
          <input
            value={data.googleMerchantId || ""}
            onChange={(e) => update("googleMerchantId", e.target.value)}
            className="form-input"
            placeholder="123456789"
          />
        </FormField>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Facebook Pixel</h2>
        <FormField label="Pixel ID">
          <input
            value={data.facebookPixelId || ""}
            onChange={(e) => update("facebookPixelId", e.target.value)}
            className="form-input"
            placeholder="123456789012345"
          />
        </FormField>
      </div>

      {/* Mevcut Entegrasyon Durumları */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Sistem Entegrasyonları</h2>
        <div className="space-y-3">
          {[
            { name: "iyzico", desc: "Ödeme altyapısı (3D Secure)", status: true },
            { name: "Geliver", desc: "Kargo entegrasyonu", status: true },
            { name: "DIA CRM", desc: "E-Fatura / E-Arşiv", status: true },
            { name: "Resend", desc: "E-posta gönderimi", status: true },
          ].map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  item.status
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                {item.status ? "Bağlı" : "Yapılandırılacak"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 4: AI SATIŞ TEMSİLCİSİ
// ============================================================
function AiTab({
  data,
  update,
}: {
  data: SiteSettings;
  update: (field: keyof SiteSettings, value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">AI Satış Temsilcisi</h2>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={data.aiEnabled}
              onChange={(e) => update("aiEnabled", e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#7AC143] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-[#7AC143]/25" />
            <span className="ml-2 text-sm font-medium text-gray-700">
              {data.aiEnabled ? "Aktif" : "Pasif"}
            </span>
          </label>
        </div>

        {!data.aiEnabled && (
          <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            AI Satış Temsilcisi şu an devre dışı. Etkinleştirmek için toggle&apos;ı açın.
          </div>
        )}

        <div className="space-y-4">
          <FormField label="Sistem Prompt" hint="AI'ın nasıl davranacağını tanımlayın">
            <textarea
              value={data.aiSystemPrompt || ""}
              onChange={(e) => update("aiSystemPrompt", e.target.value)}
              className="form-input min-h-[200px] resize-y font-mono text-sm"
              rows={8}
              placeholder={`Sen Vorte Tekstil'in AI satış temsilcisisin.\n\nGörevlerin:\n- Müşterilere ürünler hakkında bilgi ver\n- Beden ve renk seçiminde yardımcı ol\n- Toptan satış hakkında bilgi ver`}
            />
          </FormField>

          <FormField label="AI Kuralları" hint="Her satır bir kural (AI bu kurallara uyar)">
            <textarea
              value={data.aiRules || ""}
              onChange={(e) => update("aiRules", e.target.value)}
              className="form-input min-h-[150px] resize-y font-mono text-sm"
              rows={6}
              placeholder={`Fiyat bilgisi sor, direkt söyleme\nRakip firmalardan bahsetme\nKargo ve iade politikasını açıkla\nTürkçe yanıt ver`}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 5: SOSYAL MEDYA
// ============================================================
function SosyalTab({
  data,
  update,
}: {
  data: SiteSettings;
  update: (field: keyof SiteSettings, value: unknown) => void;
}) {
  const socialFields = [
    { field: "instagramUrl" as const, label: "Instagram", placeholder: "https://instagram.com/vortetekstil", icon: "📸" },
    { field: "facebookUrl" as const, label: "Facebook", placeholder: "https://facebook.com/vortetekstil", icon: "📘" },
    { field: "twitterUrl" as const, label: "Twitter / X", placeholder: "https://x.com/vortetekstil", icon: "🐦" },
    { field: "tiktokUrl" as const, label: "TikTok", placeholder: "https://tiktok.com/@vortetekstil", icon: "🎵" },
    { field: "youtubeUrl" as const, label: "YouTube", placeholder: "https://youtube.com/@vortetekstil", icon: "🎬" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Sosyal Medya Hesapları</h2>
        <p className="mb-4 text-sm text-gray-500">
          Sosyal medya linkleriniz site footer&apos;ında ve iletişim sayfasında görüntülenir.
        </p>
        <div className="space-y-4">
          {socialFields.map((item) => (
            <FormField key={item.field} label={`${item.icon} ${item.label}`}>
              <input
                value={data[item.field] || ""}
                onChange={(e) => update(item.field, e.target.value)}
                className="form-input"
                placeholder={item.placeholder}
              />
            </FormField>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 6: E-POSTA
// ============================================================
function EmailTab({
  data,
  update,
}: {
  data: SiteSettings;
  update: (field: keyof SiteSettings, value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">SMTP Ayarları</h2>
        <p className="mb-4 text-sm text-gray-500">
          E-posta gönderimi için SMTP sunucu bilgilerini girin. Boş bırakırsanız varsayılan Resend
          servisi kullanılır.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="SMTP Sunucu">
            <input
              value={data.smtpHost || ""}
              onChange={(e) => update("smtpHost", e.target.value)}
              className="form-input"
              placeholder="smtp.gmail.com"
            />
          </FormField>
          <FormField label="SMTP Port">
            <input
              type="number"
              value={data.smtpPort ?? ""}
              onChange={(e) => update("smtpPort", e.target.value ? Number(e.target.value) : null)}
              className="form-input"
              placeholder="587"
            />
          </FormField>
          <FormField label="Kullanıcı Adı">
            <input
              value={data.smtpUser || ""}
              onChange={(e) => update("smtpUser", e.target.value)}
              className="form-input"
              placeholder="noreply@vorte.com.tr"
            />
          </FormField>
          <FormField label="Şifre">
            <input
              type="password"
              value={data.smtpPassword || ""}
              onChange={(e) => update("smtpPassword", e.target.value)}
              className="form-input"
              placeholder="••••••••"
            />
          </FormField>
        </div>
      </div>

      {/* Mevcut E-posta Servisi */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Aktif E-posta Servisi</h2>
        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <p className="font-medium text-gray-900">Resend</p>
            <p className="text-xs text-gray-500">Transactional e-posta servisi</p>
          </div>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            Aktif
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function FormField({
  label,
  children,
  hint,
  required,
  trailing,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {trailing}
      </div>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
