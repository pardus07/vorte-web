"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Eye } from "lucide-react";

interface BlogData {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  seoTitle: string;
  seoDescription: string;
  published: boolean;
  publishedAt: string;
  authorName: string;
  tags: string;
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function BlogDuzenle() {
  const { id } = useParams();
  const router = useRouter();
  const isNew = id === "yeni";

  const [form, setForm] = useState<BlogData>({
    id: "",
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImage: "",
    seoTitle: "",
    seoDescription: "",
    published: false,
    publishedAt: "",
    authorName: "Vorte Tekstil",
    tags: "",
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  const fetchPost = useCallback(async () => {
    if (isNew) return;
    const res = await fetch(`/api/admin/blog/${id}`);
    if (res.ok) {
      const data = await res.json();
      setForm({
        ...data,
        excerpt: data.excerpt || "",
        coverImage: data.coverImage || "",
        seoTitle: data.seoTitle || "",
        seoDescription: data.seoDescription || "",
        publishedAt: data.publishedAt ? data.publishedAt.split("T")[0] : "",
        tags: data.tags || "",
      });
      setAutoSlug(false);
    }
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => { fetchPost(); }, [fetchPost]);

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: autoSlug ? slugify(title) : f.slug,
    }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.slug || !form.content) {
      setError("Başlık, slug ve içerik zorunludur.");
      return;
    }

    setSaving(true);
    setError("");

    const url = isNew ? "/api/admin/blog" : `/api/admin/blog/${id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt || null,
        content: form.content,
        coverImage: form.coverImage || null,
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
        published: form.published,
        publishedAt: form.publishedAt || null,
        authorName: form.authorName,
        tags: form.tags || null,
      }),
    });

    if (res.ok) {
      router.push("/admin/blog");
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
          <Link href="/admin/blog" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? "Yeni Blog Yazısı" : "Blog Yazısı Düzenle"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && form.slug && (
            <a href={`/blog/${form.slug}?preview=1`} target="_blank" className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
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
                placeholder="Blog yazısı başlığı"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Slug *</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">/blog/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => { setForm({ ...form, slug: e.target.value }); setAutoSlug(false); }}
                  className="form-input flex-1 font-mono text-sm"
                  placeholder="yazi-slug"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Kısa Özet</label>
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                className="form-input w-full"
                rows={3}
                placeholder="Yazının kısa özeti (liste sayfasında görünür)"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">İçerik * (HTML)</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="form-input w-full font-mono text-sm"
                rows={20}
                placeholder="<h2>Alt Başlık</h2>&#10;<p>Paragraf içeriği...</p>"
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
                value={form.seoTitle}
                onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                className="form-input w-full"
                placeholder="Boş bırakılırsa yazı başlığı kullanılır"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">SEO Açıklaması</label>
              <textarea
                value={form.seoDescription}
                onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                className="form-input w-full"
                rows={3}
                placeholder="Yazı açıklaması (max 160 karakter)"
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
                onChange={(e) => {
                  const published = e.target.checked;
                  setForm((f) => ({
                    ...f,
                    published,
                    // Yayınla işaretlendiğinde tarih boşsa bugünü ata
                    publishedAt: published && !f.publishedAt
                      ? new Date().toISOString().split("T")[0]
                      : f.publishedAt,
                  }));
                }}
                className="h-4 w-4 rounded border-gray-300 text-[#7AC143]"
              />
              <span className="text-sm text-gray-700">Yayınla</span>
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Yayın Tarihi</label>
              <input
                type="date"
                value={form.publishedAt}
                onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Yazar</label>
              <input
                type="text"
                value={form.authorName}
                onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                className="form-input w-full"
              />
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-500">Medya</h3>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Kapak Görseli URL</label>
              <input
                type="text"
                value={form.coverImage}
                onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                className="form-input w-full text-sm"
                placeholder="/images/blog/kapak.jpg"
              />
              <p className="mt-1 text-xs text-gray-400">Önerilen boyut: 1200x630px</p>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-500">Etiketler</h3>
            <div>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="form-input w-full text-sm"
                placeholder="etiket1, etiket2, etiket3"
              />
              <p className="mt-1 text-xs text-gray-400">Virgülle ayırarak yazın</p>
            </div>
            {form.tags && (
              <div className="flex flex-wrap gap-1">
                {form.tags.split(",").map((tag, i) => (
                  <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
