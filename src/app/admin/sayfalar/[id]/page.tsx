"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Eye } from "lucide-react";

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

  if (loading) return <div className="py-20 text-center text-gray-400">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/sayfalar" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? "Yeni Sayfa" : "Sayfa Düzenle"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <a href={`/${form.slug}`} target="_blank" className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <Eye className="h-4 w-4" /> Önizle
            </a>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-6 py-2 text-sm font-medium text-white hover:bg-[#6aad38] disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border bg-white p-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Başlık *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="form-input w-full"
                placeholder="Sayfa başlığı"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Slug *</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => { setForm({ ...form, slug: e.target.value }); setAutoSlug(false); }}
                  className="form-input flex-1 font-mono text-sm"
                  placeholder="sayfa-slug"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">İçerik (HTML)</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="form-input w-full font-mono text-sm"
                rows={20}
                placeholder="<h1>Başlık</h1>&#10;<p>İçerik...</p>"
              />
            </div>
          </div>

          {/* SEO */}
          <div className="rounded-lg border bg-white p-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-500">SEO Ayarları</h3>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">SEO Başlığı</label>
              <input
                type="text"
                value={form.seoTitle || ""}
                onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                className="form-input w-full"
                placeholder="Boş bırakılırsa sayfa başlığı kullanılır"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">SEO Açıklaması</label>
              <textarea
                value={form.seoDescription || ""}
                onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                className="form-input w-full"
                rows={3}
                placeholder="Sayfa açıklaması (max 160 karakter)"
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-white p-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-500">Yayın Ayarları</h3>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#7AC143]"
              />
              <span className="text-sm text-gray-700">Yayınla</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.showInMenu}
                onChange={(e) => setForm({ ...form, showInMenu: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#7AC143]"
              />
              <span className="text-sm text-gray-700">Menüde Göster</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.showInFooter}
                onChange={(e) => setForm({ ...form, showInFooter: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#7AC143]"
              />
              <span className="text-sm text-gray-700">Footer&apos;da Göster</span>
            </label>
          </div>

          <div className="rounded-lg border bg-white p-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-500">Sayfa Ayarları</h3>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Şablon</label>
              <select
                value={form.template}
                onChange={(e) => setForm({ ...form, template: e.target.value })}
                className="form-input w-full"
              >
                <option value="default">Varsayılan</option>
                <option value="fullwidth">Tam Genişlik</option>
                <option value="sidebar">Kenar Çubuklu</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Sıralama</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                className="form-input w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
