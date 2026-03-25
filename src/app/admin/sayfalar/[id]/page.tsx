"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Eye, FileText, Search, Settings, LayoutTemplate } from "lucide-react";

interface PageData {
  id: string;
  title: string;
  slug: string;
  content: string;
  seoTitle: string | null;
  seoDescription: string | null;
  template: string;
  published: boolean;
  order: number;
  showInMenu: boolean;
  showInFooter: boolean;
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20";

const checkboxClass =
  "h-4 w-4 rounded border-gray-300 text-[#7AC143] accent-[#7AC143]";

export default function SayfaDuzenle() {
  const { id } = useParams();
  const router = useRouter();
  const isNew = id === "yeni";

  const [form, setForm] = useState<PageData>({
    id: "",
    title: "",
    slug: "",
    content: "",
    seoTitle: "",
    seoDescription: "",
    template: "default",
    published: false,
    order: 0,
    showInMenu: false,
    showInFooter: false,
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  const fetchPage = useCallback(async () => {
    if (isNew) return;
    const res = await fetch(`/api/admin/pages/${id}`);
    if (res.ok) {
      const data = await res.json();
      setForm(data);
      setAutoSlug(false);
    }
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: autoSlug ? slugify(title) : f.slug,
    }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.slug) {
      setError("Başlık ve slug zorunludur.");
      return;
    }

    setSaving(true);
    setError("");

    const url = isNew ? "/api/admin/pages" : `/api/admin/pages/${id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        slug: form.slug,
        content: form.content,
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
        template: form.template,
        published: form.published,
        order: form.order,
        showInMenu: form.showInMenu,
        showInFooter: form.showInFooter,
      }),
    });

    if (res.ok) {
      router.push("/admin/sayfalar");
    } else {
      const data = await res.json();
      setError(data.error || "Hata oluştu");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#7AC143]" />
          <p className="text-sm text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/sayfalar"
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {isNew ? "Yeni Sayfa" : "Sayfa Düzenle"}
            </h1>
            {!isNew && form.slug && (
              <p className="mt-0.5 text-sm text-gray-400">/{form.slug}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <a
              href={`/${form.slug}`}
              target="_blank"
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            >
              <Eye className="h-4 w-4" />
              Önizle
            </a>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333] disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Page Content Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <h3 className="text-[13px] font-medium uppercase tracking-wider text-gray-500">
                Sayfa İçeriği
              </h3>
            </div>

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Başlık <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className={inputClass}
                  placeholder="Sayfa başlığı"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Slug <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="flex h-[42px] items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400 shadow-sm">
                    /
                  </span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => { setForm({ ...form, slug: e.target.value }); setAutoSlug(false); }}
                    className={`${inputClass} flex-1 font-mono`}
                    placeholder="sayfa-slug"
                  />
                </div>
                {autoSlug && (
                  <p className="mt-1 text-xs text-gray-400">
                    Başlıktan otomatik oluşturulur
                  </p>
                )}
              </div>

              {/* Content */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  İçerik (HTML)
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className={`${inputClass} font-mono leading-relaxed`}
                  rows={20}
                  placeholder={"<h1>Başlık</h1>\n<p>İçerik...</p>"}
                />
              </div>
            </div>
          </div>

          {/* SEO Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <h3 className="text-[13px] font-medium uppercase tracking-wider text-gray-500">
                SEO Ayarları
              </h3>
            </div>

            {/* SEO Preview */}
            <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <p className="text-xs text-gray-400">Arama motoru önizlemesi</p>
              <p className="mt-2 text-base font-medium text-[#1a0dab]">
                {form.seoTitle || form.title || "Sayfa Başlığı"}
              </p>
              <p className="mt-0.5 text-sm text-[#006621]">
                vorte.com.tr/{form.slug || "sayfa-slug"}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                {form.seoDescription || "Sayfa açıklaması burada görünecek..."}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  SEO Başlığı
                </label>
                <input
                  type="text"
                  value={form.seoTitle || ""}
                  onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                  className={inputClass}
                  placeholder="Boş bırakılırsa sayfa başlığı kullanılır"
                />
                <p className="mt-1 text-xs text-gray-400">
                  {(form.seoTitle || form.title || "").length}/60 karakter
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  SEO Açıklaması
                </label>
                <textarea
                  value={form.seoDescription || ""}
                  onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                  className={inputClass}
                  rows={3}
                  placeholder="Sayfa açıklaması (max 160 karakter)"
                />
                <p className="mt-1 text-xs text-gray-400">
                  {(form.seoDescription || "").length}/160 karakter
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Publish Settings Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-400" />
              <h3 className="text-[13px] font-medium uppercase tracking-wider text-gray-500">
                Yayın Ayarları
              </h3>
            </div>

            <div className="space-y-4">
              {/* Published Toggle */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  className={checkboxClass}
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Yayınla</span>
                  <p className="text-xs text-gray-400">Sayfayı ziyaretçilere göster</p>
                </div>
              </label>

              {/* Show in Menu Toggle */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.showInMenu}
                  onChange={(e) => setForm({ ...form, showInMenu: e.target.checked })}
                  className={checkboxClass}
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Menüde Göster</span>
                  <p className="text-xs text-gray-400">Üst menüde link olarak ekle</p>
                </div>
              </label>

              {/* Show in Footer Toggle */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.showInFooter}
                  onChange={(e) => setForm({ ...form, showInFooter: e.target.checked })}
                  className={checkboxClass}
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Footer&apos;da Göster</span>
                  <p className="text-xs text-gray-400">Alt bilgide link olarak ekle</p>
                </div>
              </label>
            </div>
          </div>

          {/* Page Settings Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4 text-gray-400" />
              <h3 className="text-[13px] font-medium uppercase tracking-wider text-gray-500">
                Sayfa Ayarları
              </h3>
            </div>

            <div className="space-y-5">
              {/* Template */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Şablon
                </label>
                <select
                  value={form.template}
                  onChange={(e) => setForm({ ...form, template: e.target.value })}
                  className={inputClass}
                >
                  <option value="default">Varsayılan</option>
                  <option value="fullwidth">Tam Genişlik</option>
                  <option value="sidebar">Kenar Çubuklu</option>
                </select>
              </div>

              {/* Order */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Sıralama
                </label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Menü ve footer sıralaması (0 = en başta)
                </p>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Durum</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  form.published
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    form.published ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                {form.published ? "Yayında" : "Taslak"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
