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
  Building2,
  Trash2,
  Plus,
  ChevronDown,
  Eye,
  EyeOff,
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
  aiModel: string;
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
  // Entegrasyon Ayarları
  iyzicoApiKey: string | null;
  iyzicoSecretKey: string | null;
  iyzicoSandboxMode: boolean;
  geliverApiKey: string | null;
  geliverApiBaseUrl: string | null;
  diaCrmUsername: string | null;
  diaCrmPassword: string | null;
  diaCrmCompanyCode: string | null;
  resendApiKey: string | null;
  resendFromEmail: string | null;
};

const tabs = [
  { id: "genel", label: "Genel Ayarlar", icon: Settings },
  { id: "seo", label: "SEO", icon: Search },
  { id: "entegrasyon", label: "Entegrasyonlar", icon: Code },
  { id: "ai", label: "AI Temsilci", icon: Bot },
  { id: "sosyal", label: "Sosyal Medya", icon: Share2 },
  { id: "email", label: "E-posta", icon: Mail },
  { id: "bayiler", label: "Bayi Seviyeleri", icon: Building2 },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ---------------------------------------------------------- */
/* Design-system input class (replaces all form-input usages) */
/* ---------------------------------------------------------- */
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Ayarlar</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            Magaza genel ayarlari ve entegrasyonlar
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
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
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
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
      <div>
        {activeTab === "genel" && <GenelTab data={data} update={update} />}
        {activeTab === "seo" && <SeoTab data={data} update={update} />}
        {activeTab === "entegrasyon" && <EntegrasyonTab data={data} update={update} />}
        {activeTab === "ai" && <AiTab data={data} update={update} />}
        {activeTab === "sosyal" && <SosyalTab data={data} update={update} />}
        {activeTab === "email" && <EmailTab data={data} update={update} />}
        {activeTab === "bayiler" && <BayiSeviyeTab />}
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
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Site Bilgileri</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Site Adi" required>
            <input
              value={data.siteName}
              onChange={(e) => update("siteName", e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Site URL">
            <input
              value={data.siteUrl}
              onChange={(e) => update("siteUrl", e.target.value)}
              className={inputClass}
              placeholder="https://www.vorte.com.tr"
            />
          </FormField>
          <FormField label="Site Aciklamasi" className="md:col-span-2">
            <textarea
              value={data.siteDescription || ""}
              onChange={(e) => update("siteDescription", e.target.value)}
              className={`${inputClass} min-h-[80px] resize-y`}
              rows={3}
            />
          </FormField>
        </div>
      </div>

      {/* Iletisim Bilgileri */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Iletisim Bilgileri</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="E-posta">
            <input
              type="email"
              value={data.contactEmail || ""}
              onChange={(e) => update("contactEmail", e.target.value)}
              className={inputClass}
              placeholder="info@vorte.com.tr"
            />
          </FormField>
          <FormField label="Telefon">
            <input
              value={data.contactPhone || ""}
              onChange={(e) => update("contactPhone", e.target.value)}
              className={inputClass}
              placeholder="+90 5XX XXX XXXX"
            />
          </FormField>
          <FormField label="Adres" className="md:col-span-2">
            <textarea
              value={data.contactAddress || ""}
              onChange={(e) => update("contactAddress", e.target.value)}
              className={`${inputClass} min-h-[60px] resize-y`}
              rows={2}
            />
          </FormField>
        </div>
      </div>

      {/* Logo & Favicon */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Logo & Favicon</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Logo URL" hint="Onerilen: 256x80px, PNG/SVG">
            <input
              value={data.logoUrl || ""}
              onChange={(e) => update("logoUrl", e.target.value)}
              className={inputClass}
              placeholder="/logo.png"
            />
          </FormField>
          <FormField label="Logo (Koyu Tema)" hint="Onerilen: 256x80px, PNG/SVG">
            <input
              value={data.logoDarkUrl || ""}
              onChange={(e) => update("logoDarkUrl", e.target.value)}
              className={inputClass}
              placeholder="/logo-dark.png"
            />
          </FormField>
          <FormField label="Favicon URL" hint="Onerilen: 32x32px ve 180x180px, ICO/PNG">
            <input
              value={data.faviconUrl || ""}
              onChange={(e) => update("faviconUrl", e.target.value)}
              className={inputClass}
              placeholder="/favicon.ico"
            />
          </FormField>
          <FormField label="OG Image" hint="Zorunlu: 1200x630px, PNG/JPG">
            <input
              value={data.ogImageUrl || ""}
              onChange={(e) => update("ogImageUrl", e.target.value)}
              className={inputClass}
              placeholder="/og-image.jpg"
            />
          </FormField>
        </div>
      </div>

      {/* Kargo */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Kargo Ayarlari</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Ucretsiz Kargo Limiti (TL)">
            <input
              type="number"
              step="0.01"
              value={data.freeShippingThreshold ?? ""}
              onChange={(e) =>
                update("freeShippingThreshold", e.target.value ? Number(e.target.value) : null)
              }
              className={inputClass}
              placeholder="200"
            />
          </FormField>
          <FormField label="Standart Kargo Ucreti (TL)">
            <input
              type="number"
              step="0.01"
              value={data.defaultShippingCost ?? ""}
              onChange={(e) =>
                update("defaultShippingCost", e.target.value ? Number(e.target.value) : null)
              }
              className={inputClass}
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
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Ana Sayfa SEO</h2>
        <div className="space-y-4">
          <FormField
            label="Meta Title"
            trailing={<CharCounter value={data.metaTitle || ""} max={60} />}
          >
            <input
              value={data.metaTitle || ""}
              onChange={(e) => update("metaTitle", e.target.value)}
              className={inputClass}
              placeholder="Vorte Tekstil | Kaliteli Ic Giyim"
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
              className={`${inputClass} min-h-[80px] resize-y`}
              rows={3}
              maxLength={170}
              placeholder="Vorte Tekstil - Erkek boxer ve kadin ic giyim urunleri..."
            />
          </FormField>

          <FormField label="Meta Keywords" hint="Virgulle ayirarak yazin">
            <input
              value={data.metaKeywords || ""}
              onChange={(e) => update("metaKeywords", e.target.value)}
              className={inputClass}
              placeholder="ic giyim, erkek boxer, kadin kulot, toptan"
            />
          </FormField>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Arama Motoru Dogrulama</h2>
        <FormField label="Google Search Console Dogrulama Kodu">
          <input
            value={data.googleVerificationCode || ""}
            onChange={(e) => update("googleVerificationCode", e.target.value)}
            className={inputClass}
            placeholder="google-site-verification=XXXXX"
          />
        </FormField>
      </div>

      {/* SEO Preview */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Google Arama Onizleme</h2>
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
          <p className="text-lg text-blue-700 hover:underline">
            {data.metaTitle || "Vorte Tekstil | Kaliteli Ic Giyim - Toptan ve Perakende"}
          </p>
          <p className="text-sm text-green-700">{data.siteUrl}</p>
          <p className="mt-1 text-sm text-gray-600">
            {data.metaDescription ||
              "Vorte Tekstil - Erkek boxer ve kadin ic giyim urunleri. Toptan ve perakende satis."}
          </p>
        </div>
      </div>

      {/* Useful Links */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">SEO Araclari</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            sitemap.xml
          </a>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            robots.txt
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
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Google Analytics</h2>
        <FormField label="Olcum ID" hint="G-XXXXXXXXXX formatinda">
          <input
            value={data.googleAnalyticsId || ""}
            onChange={(e) => update("googleAnalyticsId", e.target.value)}
            className={inputClass}
            placeholder="G-XXXXXXXXXX"
          />
        </FormField>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Google Ads</h2>
        <FormField label="Donusum Kodu" hint="<head> ve <body> kodlarini buraya yapistirin">
          <textarea
            value={data.googleAdsCode || ""}
            onChange={(e) => update("googleAdsCode", e.target.value)}
            className={`${inputClass} min-h-[120px] resize-y font-mono text-xs`}
            rows={5}
            placeholder="<!-- Google Ads kodu -->"
          />
        </FormField>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Google Merchant Center</h2>
        <FormField label="Merchant Center ID">
          <input
            value={data.googleMerchantId || ""}
            onChange={(e) => update("googleMerchantId", e.target.value)}
            className={inputClass}
            placeholder="123456789"
          />
        </FormField>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Facebook Pixel</h2>
        <FormField label="Pixel ID">
          <input
            value={data.facebookPixelId || ""}
            onChange={(e) => update("facebookPixelId", e.target.value)}
            className={inputClass}
            placeholder="123456789012345"
          />
        </FormField>
      </div>

      {/* Sistem Entegrasyonlari -- Acilir/Kapanir Kartlar */}
      <IntegrationCards data={data} update={update} />
    </div>
  );
}

// ============================================================
// INTEGRATION CARDS (Expandable)
// ============================================================
function SecretField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField label={label}>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-10`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 transition-colors hover:text-gray-600"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FormField>
  );
}

function IntegrationCards({
  data,
  update,
}: {
  data: SiteSettings;
  update: (field: keyof SiteSettings, value: unknown) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const integrations = [
    {
      key: "iyzico",
      name: "iyzico",
      desc: "Odeme altyapisi (3D Secure)",
      connected: !!(data.iyzicoApiKey && data.iyzicoSecretKey),
    },
    {
      key: "geliver",
      name: "Geliver",
      desc: "Kargo entegrasyonu",
      connected: !!data.geliverApiKey,
    },
    {
      key: "dia",
      name: "DIA CRM",
      desc: "E-Fatura / E-Arsiv",
      connected: !!(data.diaCrmUsername && data.diaCrmPassword),
    },
    {
      key: "resend",
      name: "Resend",
      desc: "E-posta gonderimi",
      connected: !!data.resendApiKey,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Sistem Entegrasyonlari</h2>
      <div className="space-y-3">
        {integrations.map((item) => (
          <div key={item.key} className="rounded-xl border border-gray-200">
            {/* Card Header -- tiklanabilir */}
            <button
              type="button"
              onClick={() => setExpanded(expanded === item.key ? null : item.key)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-gray-50/60"
            >
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    item.connected
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {item.connected ? "Bagli" : "Yapilandirilacak"}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform ${
                    expanded === item.key ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {/* Card Body -- genisletildiginde gorunur */}
            {expanded === item.key && (
              <div className="space-y-4 border-t px-5 py-5">
                {item.key === "iyzico" && (
                  <>
                    <SecretField
                      label="API Key"
                      value={data.iyzicoApiKey || ""}
                      onChange={(v) => update("iyzicoApiKey", v)}
                      placeholder="sandbox-..."
                    />
                    <SecretField
                      label="Secret Key"
                      value={data.iyzicoSecretKey || ""}
                      onChange={(v) => update("iyzicoSecretKey", v)}
                      placeholder="sandbox-..."
                    />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Sandbox Modu</p>
                        <p className="text-xs text-gray-500">Test ortami icin acik birakin</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={data.iyzicoSandboxMode}
                          onChange={(e) => update("iyzicoSandboxMode", e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#7AC143] peer-checked:after:translate-x-full peer-checked:after:border-white" />
                      </label>
                    </div>
                  </>
                )}

                {item.key === "geliver" && (
                  <>
                    <SecretField
                      label="API Key"
                      value={data.geliverApiKey || ""}
                      onChange={(v) => update("geliverApiKey", v)}
                      placeholder="glvr_..."
                    />
                    <FormField label="API Base URL" hint="Varsayilan: https://api.geliver.io">
                      <input
                        value={data.geliverApiBaseUrl || ""}
                        onChange={(e) => update("geliverApiBaseUrl", e.target.value)}
                        className={inputClass}
                        placeholder="https://api.geliver.io"
                      />
                    </FormField>
                  </>
                )}

                {item.key === "dia" && (
                  <>
                    <FormField label="Kullanici Adi">
                      <input
                        value={data.diaCrmUsername || ""}
                        onChange={(e) => update("diaCrmUsername", e.target.value)}
                        className={inputClass}
                        placeholder="DIA kullanici adi"
                      />
                    </FormField>
                    <SecretField
                      label="Sifre"
                      value={data.diaCrmPassword || ""}
                      onChange={(v) => update("diaCrmPassword", v)}
                      placeholder="DIA sifresi"
                    />
                    <FormField label="Sirket Kodu">
                      <input
                        value={data.diaCrmCompanyCode || ""}
                        onChange={(e) => update("diaCrmCompanyCode", e.target.value)}
                        className={inputClass}
                        placeholder="Sirket kodu"
                      />
                    </FormField>
                  </>
                )}

                {item.key === "resend" && (
                  <>
                    <SecretField
                      label="API Key"
                      value={data.resendApiKey || ""}
                      onChange={(v) => update("resendApiKey", v)}
                      placeholder="re_..."
                    />
                    <FormField label="Gonderen E-posta" hint="Domain dogrulamasi gerekir">
                      <input
                        type="email"
                        value={data.resendFromEmail || ""}
                        onChange={(e) => update("resendFromEmail", e.target.value)}
                        className={inputClass}
                        placeholder="noreply@vorte.com.tr"
                      />
                    </FormField>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TAB 4: AI SATIS TEMSILCISI
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
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">AI Satis Temsilcisi</h2>
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
          <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            AI Satis Temsilcisi su an devre disi. Etkinlestirmek icin toggle&apos;i acin.
          </div>
        )}

        <div className="space-y-4">
          <FormField label="AI Modeli" hint="Chatbot&apos;un kullandigi Claude modeli">
            <select
              value={data.aiModel || "claude-haiku-4-5"}
              onChange={(e) => update("aiModel", e.target.value)}
              className={inputClass}
            >
              <option value="claude-haiku-4-5">Claude Haiku 4.5 (Hizli, ekonomik)</option>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (Dengeli)</option>
              <option value="claude-opus-4-6">Claude Opus 4.6 (En guclu)</option>
            </select>
          </FormField>

          <FormField label="Sistem Prompt" hint="AI&apos;in nasil davranacagini tanimlayin">
            <textarea
              value={data.aiSystemPrompt || ""}
              onChange={(e) => update("aiSystemPrompt", e.target.value)}
              className={`${inputClass} min-h-[200px] resize-y font-mono text-sm`}
              rows={8}
              placeholder={`Sen Vorte Tekstil'in AI satis temsilcisisin.\n\nGorevlerin:\n- Musterilere urunler hakkinda bilgi ver\n- Beden ve renk seciminde yardimci ol\n- Toptan satis hakkinda bilgi ver`}
            />
          </FormField>

          <FormField label="AI Kurallari" hint="Her satir bir kural (AI bu kurallara uyar)">
            <textarea
              value={data.aiRules || ""}
              onChange={(e) => update("aiRules", e.target.value)}
              className={`${inputClass} min-h-[150px] resize-y font-mono text-sm`}
              rows={6}
              placeholder={`Fiyat bilgisi sor, direkt soyleme\nRakip firmalardan bahsetme\nKargo ve iade politikasini acikla\nTurkce yanit ver`}
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
    { field: "instagramUrl" as const, label: "Instagram", placeholder: "https://instagram.com/vortetekstil" },
    { field: "facebookUrl" as const, label: "Facebook", placeholder: "https://facebook.com/vortetekstil" },
    { field: "twitterUrl" as const, label: "Twitter / X", placeholder: "https://x.com/vortetekstil" },
    { field: "tiktokUrl" as const, label: "TikTok", placeholder: "https://tiktok.com/@vortetekstil" },
    { field: "youtubeUrl" as const, label: "YouTube", placeholder: "https://youtube.com/@vortetekstil" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Sosyal Medya Hesaplari</h2>
        <p className="mb-4 text-[13px] text-gray-500">
          Sosyal medya linkleriniz site footer&apos;inda ve iletisim sayfasinda goruntulenir.
        </p>
        <div className="space-y-4">
          {socialFields.map((item) => (
            <FormField key={item.field} label={item.label}>
              <input
                value={data[item.field] || ""}
                onChange={(e) => update(item.field, e.target.value)}
                className={inputClass}
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
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">SMTP Ayarlari</h2>
        <p className="mb-4 text-[13px] text-gray-500">
          E-posta gonderimi icin SMTP sunucu bilgilerini girin. Bos birakirsaniz varsayilan Resend
          servisi kullanilir.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="SMTP Sunucu">
            <input
              value={data.smtpHost || ""}
              onChange={(e) => update("smtpHost", e.target.value)}
              className={inputClass}
              placeholder="smtp.gmail.com"
            />
          </FormField>
          <FormField label="SMTP Port">
            <input
              type="number"
              value={data.smtpPort ?? ""}
              onChange={(e) => update("smtpPort", e.target.value ? Number(e.target.value) : null)}
              className={inputClass}
              placeholder="587"
            />
          </FormField>
          <FormField label="Kullanici Adi">
            <input
              value={data.smtpUser || ""}
              onChange={(e) => update("smtpUser", e.target.value)}
              className={inputClass}
              placeholder="noreply@vorte.com.tr"
            />
          </FormField>
          <FormField label="Sifre">
            <input
              type="password"
              value={data.smtpPassword || ""}
              onChange={(e) => update("smtpPassword", e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </FormField>
        </div>
      </div>

      {/* Mevcut E-posta Servisi */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Aktif E-posta Servisi</h2>
        <div className="flex items-center justify-between rounded-xl border border-gray-200 px-5 py-3.5">
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

// ============================================================
// TAB 7: BAYi SEVIYELERI
// ============================================================
interface TierData {
  id: string;
  tier: string;
  discountRate: number;
  minOrderAmount: number;
  paymentTermDays: number;
  description: string | null;
  dealerCount: number;
}

function BayiSeviyeTab() {
  const [tiers, setTiers] = useState<TierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editForm, setEditForm] = useState({
    tier: "",
    discountRate: "",
    minOrderAmount: "",
    paymentTermDays: "0",
    description: "",
  });
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [tierSaving, setTierSaving] = useState(false);

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dealers/tiers");
      const data = await res.json();
      setTiers(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    setLoading(false);
  };

  useState(() => { fetchTiers(); });

  const handleSaveTier = async () => {
    setTierSaving(true);
    try {
      const res = await fetch("/api/admin/dealers/tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: editForm.tier,
          discountRate: parseFloat(editForm.discountRate) || 0,
          minOrderAmount: parseFloat(editForm.minOrderAmount) || 0,
          paymentTermDays: parseInt(editForm.paymentTermDays) || 0,
          description: editForm.description || undefined,
        }),
      });
      if (res.ok) {
        await fetchTiers();
        setShowForm(false);
        setEditingTier(null);
        setEditForm({ tier: "", discountRate: "", minOrderAmount: "", paymentTermDays: "0", description: "" });
      }
    } catch { /* silent */ }
    setTierSaving(false);
  };

  const handleDeleteTier = async (tier: string) => {
    if (!confirm(`"${tier}" seviyesini silmek istediginizden emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/admin/dealers/tiers?tier=${tier}`, { method: "DELETE" });
      if (res.ok) {
        await fetchTiers();
      } else {
        const data = await res.json();
        alert(data.error || "Silinemedi");
      }
    } catch { /* silent */ }
  };

  const startEdit = (tier: TierData) => {
    setEditForm({
      tier: tier.tier,
      discountRate: String(tier.discountRate),
      minOrderAmount: String(tier.minOrderAmount),
      paymentTermDays: String(tier.paymentTermDays),
      description: tier.description || "",
    });
    setEditingTier(tier.tier);
    setShowForm(true);
  };

  const TIER_LABELS: Record<string, string> = {
    standard: "Standard",
    silver: "Silver",
    gold: "Gold",
    platinum: "Platinum",
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Bayi Seviyeleri</h3>
            <p className="mt-1 text-[13px] text-gray-500">
              Her seviye icin varsayilan iskonto, minimum tutar ve vade gunu tanimlayin.
            </p>
          </div>
          <button
            onClick={() => {
              setEditForm({ tier: "", discountRate: "", minOrderAmount: "", paymentTermDays: "0", description: "" });
              setEditingTier(null);
              setShowForm(!showForm);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" /> Yeni Seviye
          </button>
        </div>

        {showForm && (
          <div className="mb-6 rounded-xl border border-[#7AC143]/30 bg-[#7AC143]/5 p-5">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">
              {editingTier ? `"${TIER_LABELS[editingTier] || editingTier}" Duzenle` : "Yeni Seviye Ekle"}
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Seviye Adi (key)">
                <input
                  type="text"
                  value={editForm.tier}
                  onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })}
                  className={inputClass}
                  placeholder="Orn: gold"
                  disabled={!!editingTier}
                />
              </FormField>
              <FormField label="Iskonto Orani (%)">
                <input
                  type="number"
                  value={editForm.discountRate}
                  onChange={(e) => setEditForm({ ...editForm, discountRate: e.target.value })}
                  className={inputClass}
                  placeholder="Orn: 15"
                  step="0.5"
                />
              </FormField>
              <FormField label="Min Siparis Tutari (TL)">
                <input
                  type="number"
                  value={editForm.minOrderAmount}
                  onChange={(e) => setEditForm({ ...editForm, minOrderAmount: e.target.value })}
                  className={inputClass}
                  placeholder="Orn: 5000"
                />
              </FormField>
              <FormField label="Vade Gunu">
                <input
                  type="number"
                  value={editForm.paymentTermDays}
                  onChange={(e) => setEditForm({ ...editForm, paymentTermDays: e.target.value })}
                  className={inputClass}
                  placeholder="0 = Pesin"
                />
              </FormField>
              <FormField label="Aciklama" className="sm:col-span-2">
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className={inputClass}
                  placeholder="Bu seviye hakkinda kisa aciklama"
                />
              </FormField>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setShowForm(false); setEditingTier(null); }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                Iptal
              </button>
              <button
                onClick={handleSaveTier}
                disabled={tierSaving || !editForm.tier}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333] disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {tierSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : tiers.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <p>Henuz seviye tanimlamamis.</p>
            <p className="mt-1 text-xs">Varsayilan seviyeler: standard, silver, gold, platinum</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-700">Seviye</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-700">Iskonto (%)</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-700">Min Tutar (TL)</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-700">Vade (Gun)</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-700">Bayi Sayisi</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-700">Islem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tiers.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-medium capitalize text-gray-900">
                      {TIER_LABELS[t.tier] || t.tier}
                    </td>
                    <td className="px-4 py-3 text-gray-700">%{t.discountRate}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(t.minOrderAmount)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {t.paymentTermDays === 0 ? "Pesin" : `${t.paymentTermDays} gun`}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{t.dealerCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(t)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          title="Duzenle"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTier(t.tier)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
