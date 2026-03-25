"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { slugify } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  gender: string;
}

interface VariantRow {
  color: string;
  colorHex: string;
  size: string;
  sku: string;
  gtinBarcode: string;
  stock: number;
  price: string;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20";

const variantInputClass =
  "rounded-lg border border-gray-200 px-2.5 py-2 text-sm focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20";

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"basic" | "seo" | "variants">("basic");

  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    gender: "ERKEK" as "ERKEK" | "KADIN",
    basePrice: "",
    costPrice: "",
    weight: "",
    featured: false,
    images: [] as string[],
    seoTitle: "",
    seoDescription: "",
    googleCategory: "",
  });

  const [imageUrl, setImageUrl] = useState("");

  const [variants, setVariants] = useState<VariantRow[]>([
    { color: "", colorHex: "#000000", size: "S", sku: "", gtinBarcode: "", stock: 0, price: "" },
  ]);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || data || []))
      .catch(() => {});
  }, []);

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { color: "", colorHex: "#000000", size: "M", sku: "", gtinBarcode: "", stock: 0, price: "" },
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof VariantRow, value: string | number) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const addImage = () => {
    const url = imageUrl.trim();
    if (url && !form.images.includes(url)) {
      setForm((p) => ({ ...p, images: [...p.images, url] }));
      setImageUrl("");
    }
  };

  const removeImage = (index: number) => {
    setForm((p) => ({ ...p, images: p.images.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          basePrice: Number(form.basePrice),
          costPrice: form.costPrice ? Number(form.costPrice) : null,
          weight: form.weight ? Number(form.weight) : null,
          seoTitle: form.seoTitle || null,
          seoDescription: form.seoDescription || null,
          googleCategory: form.googleCategory || null,
          variants: variants.map((v) => ({
            ...v,
            stock: Number(v.stock),
            price: v.price ? Number(v.price) : null,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/admin/urunler/${data.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Ürün oluşturulamadı");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const generatedSlug = slugify(form.name);

  const tabs = [
    { id: "basic" as const, label: "Temel Bilgiler" },
    { id: "seo" as const, label: "SEO & Görsel" },
    { id: "variants" as const, label: "Varyantlar" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/urunler"
          className="rounded-xl p-2 transition-colors hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Yeni Ürün</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-[#7AC143] text-[#7AC143]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Tab: Basic Info */}
        {activeTab === "basic" && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Temel Bilgiler</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {/* Product Name */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Ürün Adı *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className={inputClass}
                  placeholder="Erkek Boxer Premium"
                />
                {form.name && (
                  <p className="mt-1.5 text-xs text-gray-400">
                    Slug: <span className="font-mono">{generatedSlug}</span>
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Açıklama
                </label>
                <textarea
                  rows={16}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className={`${inputClass} font-mono text-xs leading-relaxed`}
                  placeholder="Ürün açıklaması — düz metin formatında yazın"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Cinsiyet *
                </label>
                <select
                  value={form.gender}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, gender: e.target.value as "ERKEK" | "KADIN" }))
                  }
                  className={inputClass}
                >
                  <option value="ERKEK">Erkek</option>
                  <option value="KADIN">Kadın</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Kategori *
                </label>
                <select
                  required
                  value={form.categoryId}
                  onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Seçin...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.gender})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sale Price */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Satış Fiyatı (₺) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={form.basePrice}
                  onChange={(e) => setForm((p) => ({ ...p, basePrice: e.target.value }))}
                  className={inputClass}
                />
              </div>

              {/* Cost Price */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Maliyet Fiyatı (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costPrice}
                  onChange={(e) => setForm((p) => ({ ...p, costPrice: e.target.value }))}
                  className={inputClass}
                  placeholder="İsteğe bağlı"
                />
              </div>

              {/* Weight */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Ağırlık (g)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={form.weight}
                  onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
                  className={inputClass}
                  placeholder="Gram cinsinden"
                />
              </div>

              {/* Featured */}
              <div className="flex items-center gap-2.5 pt-6">
                <input
                  type="checkbox"
                  id="featured"
                  checked={form.featured}
                  onChange={(e) => setForm((p) => ({ ...p, featured: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 accent-[#7AC143]"
                />
                <label htmlFor="featured" className="text-sm text-gray-700">
                  Öne Çıkan Ürün
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab: SEO & Images */}
        {activeTab === "seo" && (
          <>
            {/* Images Card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Ürün Görselleri</h2>
              <p className="mt-1 text-xs text-gray-500">
                Görsellerin URL adreslerini ekleyin. İlk görsel ana görsel olarak kullanılır.
              </p>

              <div className="mt-4 flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className={`${inputClass} flex-1`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addImage();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addImage}
                  className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Ekle
                </button>
              </div>

              {form.images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {form.images.map((url, i) => (
                    <div
                      key={i}
                      className="group relative rounded-xl border border-gray-100 bg-white p-2 shadow-sm"
                    >
                      <div className="relative h-24 w-full overflow-hidden rounded-lg bg-gray-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Görsel ${i + 1}`}
                          className="h-full w-full object-contain"
                        />
                        {i === 0 && (
                          <span className="absolute left-1.5 top-1.5 rounded-md bg-[#7AC143] px-1.5 py-0.5 text-[10px] font-bold text-white">
                            ANA
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -right-2 -top-2 hidden rounded-full bg-red-500 p-1 text-white shadow-sm group-hover:block"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {form.images.length === 0 && (
                <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-10 text-gray-400">
                  <ImageIcon className="mb-2 h-8 w-8" />
                  <p className="text-sm">Henüz görsel eklenmemiş</p>
                </div>
              )}
            </div>

            {/* SEO Card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">SEO Bilgileri</h2>
              <p className="mt-1 text-xs text-gray-500">
                Boş bırakılırsa ürün adı ve açıklaması kullanılır.
              </p>

              <div className="mt-5 space-y-5">
                {/* SEO Title */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">SEO Başlığı</label>
                    <span
                      className={`text-xs ${
                        form.seoTitle.length > 60 ? "text-red-500" : "text-gray-400"
                      }`}
                    >
                      {form.seoTitle.length}/60
                    </span>
                  </div>
                  <input
                    type="text"
                    value={form.seoTitle}
                    onChange={(e) => setForm((p) => ({ ...p, seoTitle: e.target.value }))}
                    className={inputClass}
                    placeholder={form.name || "Ürün adı"}
                    maxLength={70}
                  />
                </div>

                {/* SEO Description */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">SEO Açıklaması</label>
                    <span
                      className={`text-xs ${
                        form.seoDescription.length > 160 ? "text-red-500" : "text-gray-400"
                      }`}
                    >
                      {form.seoDescription.length}/160
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={form.seoDescription}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, seoDescription: e.target.value }))
                    }
                    className={inputClass}
                    placeholder={form.description || "Ürün açıklaması"}
                    maxLength={170}
                  />
                </div>

                {/* Google Category */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Google Ürün Kategorisi
                  </label>
                  <input
                    type="text"
                    value={form.googleCategory}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, googleCategory: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="Giyim ve Aksesuarlar > İç Giyim"
                  />
                  <p className="mt-1.5 text-xs text-gray-400">
                    Google Merchant Center için ürün kategorisi
                  </p>
                </div>

                {/* SEO Preview */}
                {(form.seoTitle || form.name) && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Google Önizleme
                    </p>
                    <div className="mt-3">
                      <p className="text-lg text-blue-700 hover:underline">
                        {form.seoTitle || form.name} - Vorte Tekstil
                      </p>
                      <p className="text-sm text-green-700">
                        www.vorte.com.tr/urun/{generatedSlug || "..."}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-600">
                        {form.seoDescription ||
                          form.description ||
                          "Ürün açıklaması burada görünecek..."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Tab: Variants */}
        {activeTab === "variants" && (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between p-6 pb-0">
              <h2 className="text-lg font-semibold text-gray-900">Varyantlar</h2>
              <button
                type="button"
                onClick={addVariant}
                className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Varyant Ekle
              </button>
            </div>

            <div className="mt-4 overflow-x-auto px-6">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-3 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Renk
                    </th>
                    <th className="px-3 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Hex
                    </th>
                    <th className="px-3 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Beden
                    </th>
                    <th className="px-3 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      SKU *
                    </th>
                    <th className="px-3 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      GTIN
                    </th>
                    <th className="px-3 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Stok
                    </th>
                    <th className="px-3 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Fiyat (₺)
                    </th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {variants.map((v, i) => (
                    <tr key={i} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          required
                          placeholder="Siyah"
                          value={v.color}
                          onChange={(e) => updateVariant(i, "color", e.target.value)}
                          className={`w-20 ${variantInputClass}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="color"
                          value={v.colorHex}
                          onChange={(e) => updateVariant(i, "colorHex", e.target.value)}
                          className="h-9 w-11 cursor-pointer rounded-lg border border-gray-200 bg-white p-0.5"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={v.size}
                          onChange={(e) => updateVariant(i, "size", e.target.value)}
                          className={variantInputClass}
                        >
                          {["S", "M", "L", "XL", "XXL"].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          required
                          placeholder="VRT-BXR-001"
                          value={v.sku}
                          onChange={(e) => updateVariant(i, "sku", e.target.value)}
                          className={`w-28 ${variantInputClass}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          placeholder="8680..."
                          value={v.gtinBarcode}
                          onChange={(e) => updateVariant(i, "gtinBarcode", e.target.value)}
                          className={`w-32 ${variantInputClass}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          required
                          min="0"
                          value={v.stock}
                          onChange={(e) => updateVariant(i, "stock", e.target.value)}
                          className={`w-16 ${variantInputClass}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Taban"
                          value={v.price}
                          onChange={(e) => updateVariant(i, "price", e.target.value)}
                          className={`w-20 ${variantInputClass}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        {variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(i)}
                            className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="px-6 py-4 text-xs text-gray-400">
              Fiyat boş bırakılırsa taban fiyat (satış fiyatı) kullanılır.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333] disabled:opacity-50"
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Kaydediliyor..." : "Ürünü Kaydet"}
          </button>
          <Link href="/admin/urunler">
            <button
              type="button"
              className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              İptal
            </button>
          </Link>
        </div>
      </form>
    </div>
  );
}
