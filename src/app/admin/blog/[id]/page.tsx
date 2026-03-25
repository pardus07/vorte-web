"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Eye, Globe, Calendar, User, Image, Tag, FileText, Search } from "lucide-react";

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

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20";

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
      setError("Baslik, slug ve icerik zorunludur.");
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
      setError(data.error || "Hata olustu");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  const seoTitleDisplay = form.seoTitle || form.title || "Sayfa Basligi";
  const seoDescDisplay = form.seoDescription || form.excerpt || "Sayfa aciklamasi buraya gelecek...";
  const seoSlugDisplay = form.slug || "sayfa-slug";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/blog"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {isNew ? "Yeni Blog Yazisi" : "Blog Yazisi Duzenle"}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {isNew ? "Yeni bir blog yazisi olusturun" : "Mevcut yaziyi duzenleyin"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {!isNew && form.slug && (
            <a
              href={`/blog/${form.slug}?preview=1`}
              target="_blank"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 inline-flex items-center gap-2 transition-colors"
            >
              <Eye className="h-4 w-4" /> Onizle
            </a>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#333] disabled:opacity-50 inline-flex items-center gap-2 transition-colors"
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

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ─── Main Content Column ─── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Content Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-[13px] font-medium uppercase tracking-wider text-gray-500">
                Icerik
              </span>
            </div>

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Baslik <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className={inputClass}
                  placeholder="Blog yazisi basligi"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Slug <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-sm text-gray-400">/blog/</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => { setForm({ ...form, slug: e.target.value }); setAutoSlug(false); }}
                    className={`${inputClass} flex-1 font-mono`}
                    placeholder="yazi-slug"
                  />
                </div>
                {autoSlug && form.title && (
                  <p className="mt-1.5 text-xs text-[#7AC143]">
                    Slug basliktan otomatik olusturuluyor
                  </p>
                )}
              </div>

              {/* Excerpt */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Kisa Ozet
                </label>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  className={inputClass}
                  rows={3}
                  placeholder="Yazinin kisa ozeti (liste sayfasinda gorunur)"
                />
              </div>

              {/* Content (HTML) */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Icerik (HTML) <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className={`${inputClass} font-mono leading-relaxed`}
                  rows={20}
                  placeholder={"<h2>Alt Baslik</h2>\n<p>Paragraf icerigi...</p>"}
                />
              </div>
            </div>
          </div>

          {/* SEO Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <span className="text-[13px] font-medium uppercase tracking-wider text-gray-500">
                SEO Ayarlari
              </span>
            </div>

            {/* Google Preview */}
            <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <p className="mb-1 text-xs text-gray-400">Google Onizleme</p>
              <p className="truncate text-base font-medium text-blue-700">{seoTitleDisplay}</p>
              <p className="truncate text-sm text-green-700">
                vorte.com.tr/blog/{seoSlugDisplay}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{seoDescDisplay}</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  SEO Basligi
                </label>
                <input
                  type="text"
                  value={form.seoTitle}
                  onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                  className={inputClass}
                  placeholder="Bos birakilirsa yazi basligi kullanilir"
                />
                <p className="mt-1 text-right text-xs text-gray-400">
                  {(form.seoTitle || form.title).length}/60
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  SEO Aciklamasi
                </label>
                <textarea
                  value={form.seoDescription}
                  onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                  className={inputClass}
                  rows={3}
                  placeholder="Yazi aciklamasi (max 160 karakter)"
                />
                <p className="mt-1 text-right text-xs text-gray-400">
                  {form.seoDescription.length}/160
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Sidebar Column ─── */}
        <div className="space-y-6">

          {/* Publish Settings Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-400" />
              <span className="text-[13px] font-medium uppercase tracking-wider text-gray-500">
                Yayin Ayarlari
              </span>
            </div>

            <div className="space-y-4">
              {/* Publish toggle */}
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 transition-colors hover:bg-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${form.published ? "bg-[#7AC143]" : "bg-gray-300"}`} />
                  <span className="text-sm font-medium text-gray-700">
                    {form.published ? "Yayinda" : "Taslak"}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => {
                    const published = e.target.checked;
                    setForm((f) => ({
                      ...f,
                      published,
                      publishedAt: published && !f.publishedAt
                        ? new Date().toISOString().split("T")[0]
                        : f.publishedAt,
                    }));
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-[#7AC143] accent-[#7AC143]"
                />
              </label>

              {/* Publish Date */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  Yayin Tarihi
                </label>
                <input
                  type="date"
                  value={form.publishedAt}
                  onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
                  className={inputClass}
                />
              </div>

              {/* Author */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  Yazar
                </label>
                <input
                  type="text"
                  value={form.authorName}
                  onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Media Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Image className="h-4 w-4 text-gray-400" />
              <span className="text-[13px] font-medium uppercase tracking-wider text-gray-500">
                Medya
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Kapak Gorseli URL
              </label>
              <input
                type="text"
                value={form.coverImage}
                onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                className={inputClass}
                placeholder="/images/blog/kapak.jpg"
              />
              <p className="mt-1.5 text-xs text-gray-400">Onerilen boyut: 1200x630px</p>
            </div>

            {/* Cover Image Preview */}
            {form.coverImage && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
                <div className="aspect-[1200/630] w-full bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.coverImage}
                    alt="Kapak onizleme"
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tags Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-400" />
              <span className="text-[13px] font-medium uppercase tracking-wider text-gray-500">
                Etiketler
              </span>
            </div>

            <div>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className={inputClass}
                placeholder="etiket1, etiket2, etiket3"
              />
              <p className="mt-1.5 text-xs text-gray-400">Virgulle ayirarak yazin</p>
            </div>

            {form.tags && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {form.tags.split(",").filter((t) => t.trim()).map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
                  >
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
