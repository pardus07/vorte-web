"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Save, Plus, Trash2, Image as ImageIcon, AlertTriangle, Star, Check, X } from "lucide-react";
import Link from "next/link";
import { slugify } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  gender: string;
}

interface Variant {
  id?: string;
  color: string;
  colorHex: string;
  size: string;
  sku: string;
  gtinBarcode: string;
  stock: number;
  price: string;
}

interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  gender: string;
  basePrice: number;
  costPrice: number | null;
  weight: number | null;
  images: string[];
  active: boolean;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  googleCategory: string | null;
  variants: Variant[];
}

export default function AdminProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"basic" | "seo" | "variants" | "reviews">("basic");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/products/${productId}`).then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
    ]).then(([prod, cats]) => {
      setProduct({
        ...prod,
        costPrice: prod.costPrice ?? null,
        weight: prod.weight ?? null,
        images: prod.images || [],
        seoTitle: prod.seoTitle || "",
        seoDescription: prod.seoDescription || "",
        googleCategory: prod.googleCategory || "",
      });
      setCategories(Array.isArray(cats) ? cats : cats.categories || []);
      setLoading(false);
    });
  }, [productId]);

  if (loading || !product) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  const addVariant = () => {
    setProduct({
      ...product,
      variants: [
        ...product.variants,
        { color: "", colorHex: "#000000", size: "M", sku: "", gtinBarcode: "", stock: 0, price: "" },
      ],
    });
  };

  const removeVariant = (index: number) => {
    setProduct({
      ...product,
      variants: product.variants.filter((_, i) => i !== index),
    });
  };

  const updateVariant = (index: number, field: string, value: string | number) => {
    const updated = [...product.variants];
    updated[index] = { ...updated[index], [field]: value };
    setProduct({ ...product, variants: updated });
  };

  const addImage = () => {
    const url = imageUrl.trim();
    if (url && !product.images.includes(url)) {
      setProduct({ ...product, images: [...product.images, url] });
      setImageUrl("");
    }
  };

  const removeImage = (index: number) => {
    setProduct({ ...product, images: product.images.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...product,
          costPrice: product.costPrice || null,
          weight: product.weight || null,
          seoTitle: product.seoTitle || null,
          seoDescription: product.seoDescription || null,
          googleCategory: product.googleCategory || null,
        }),
      });
      if (res.ok) {
        setSuccess("Ürün başarıyla güncellendi");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Güncelleme başarısız");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/admin/urunler");
      } else {
        setError("Silme işlemi başarısız");
        setShowDeleteConfirm(false);
      }
    } catch {
      setError("Bir hata oluştu");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const generatedSlug = slugify(product.name);

  const tabs = [
    { id: "basic" as const, label: "Temel Bilgiler" },
    { id: "seo" as const, label: "SEO & Görsel" },
    { id: "variants" as const, label: "Varyantlar" },
    { id: "reviews" as const, label: "Yorumlar" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/urunler" className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ürün Düzenle</h1>
            <p className="text-sm text-gray-500">{product.name}</p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Sil
        </Button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Ürünü Sil</h3>
                <p className="mt-1 text-sm text-gray-600">
                  <strong>{product.name}</strong> ürününü silmek istediğinize emin misiniz?
                  Bu işlem geri alınamaz. Tüm varyantlar da silinecektir.
                </p>
                <div className="mt-4 flex gap-3">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    loading={deleting}
                  >
                    Evet, Sil
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    İptal
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b">
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

      <div className="mt-6 space-y-6">
        {/* Tab: Basic Info */}
        {activeTab === "basic" && (
          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Temel Bilgiler</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Ürün Adı</label>
                <input
                  type="text"
                  value={product.name}
                  onChange={(e) => setProduct({ ...product, name: e.target.value })}
                  className="form-input w-full"
                />
                {product.name && (
                  <p className="mt-1 text-xs text-gray-400">
                    Slug: <span className="font-mono">{generatedSlug}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Kategori</label>
                <select
                  value={product.categoryId}
                  onChange={(e) => setProduct({ ...product, categoryId: e.target.value })}
                  className="form-input w-full"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cinsiyet</label>
                <select
                  value={product.gender}
                  onChange={(e) => setProduct({ ...product, gender: e.target.value })}
                  className="form-input w-full"
                >
                  <option value="ERKEK">Erkek</option>
                  <option value="KADIN">Kadın</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Satış Fiyatı (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={product.basePrice}
                  onChange={(e) =>
                    setProduct({ ...product, basePrice: parseFloat(e.target.value) || 0 })
                  }
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Maliyet Fiyatı (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={product.costPrice ?? ""}
                  onChange={(e) =>
                    setProduct({
                      ...product,
                      costPrice: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="form-input w-full"
                  placeholder="İsteğe bağlı"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Ağırlık (g)
                </label>
                <input
                  type="number"
                  step="1"
                  value={product.weight ?? ""}
                  onChange={(e) =>
                    setProduct({
                      ...product,
                      weight: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="form-input w-full"
                  placeholder="Gram cinsinden"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Açıklama</label>
                <textarea
                  rows={16}
                  value={product.description || ""}
                  onChange={(e) => setProduct({ ...product, description: e.target.value })}
                  className="form-input w-full font-mono text-xs leading-relaxed"
                  placeholder="Ürün açıklaması — düz metin formatında yazın"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={product.active}
                    onChange={(e) => setProduct({ ...product, active: e.target.checked })}
                    className="h-4 w-4 accent-[#7AC143]"
                  />
                  <span className="text-sm text-gray-700">Aktif</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={product.featured}
                    onChange={(e) => setProduct({ ...product, featured: e.target.checked })}
                    className="h-4 w-4 accent-[#7AC143]"
                  />
                  <span className="text-sm text-gray-700">Öne Çıkan</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab: SEO & Images */}
        {activeTab === "seo" && (
          <>
            {/* Images */}
            <div className="rounded-lg border bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900">Ürün Görselleri</h2>
              <p className="mt-1 text-xs text-gray-500">
                İlk görsel ana görsel olarak kullanılır.
              </p>

              <div className="mt-4 flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="form-input flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addImage();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addImage}>
                  <Plus className="mr-1 h-4 w-4" />
                  Ekle
                </Button>
              </div>

              {product.images.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {product.images.map((url, i) => (
                    <div key={i} className="group relative rounded-lg border p-2">
                      <div className="relative h-24 w-full overflow-hidden rounded bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Görsel ${i + 1}`}
                          className="h-full w-full object-contain"
                        />
                        {i === 0 && (
                          <span className="absolute left-1 top-1 rounded bg-[#7AC143] px-1.5 py-0.5 text-[10px] font-bold text-white">
                            ANA
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -right-2 -top-2 hidden rounded-full bg-red-500 p-1 text-white group-hover:block"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-8 text-gray-400">
                  <ImageIcon className="mb-2 h-8 w-8" />
                  <p className="text-sm">Henüz görsel eklenmemiş</p>
                </div>
              )}
            </div>

            {/* SEO */}
            <div className="rounded-lg border bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900">SEO Bilgileri</h2>
              <p className="mt-1 text-xs text-gray-500">
                Boş bırakılırsa ürün adı ve açıklaması kullanılır.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">SEO Başlığı</label>
                    <span
                      className={`text-xs ${
                        (product.seoTitle?.length || 0) > 60 ? "text-red-500" : "text-gray-400"
                      }`}
                    >
                      {product.seoTitle?.length || 0}/60
                    </span>
                  </div>
                  <input
                    type="text"
                    value={product.seoTitle || ""}
                    onChange={(e) => setProduct({ ...product, seoTitle: e.target.value })}
                    className="form-input w-full"
                    placeholder={product.name}
                    maxLength={70}
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">SEO Açıklaması</label>
                    <span
                      className={`text-xs ${
                        (product.seoDescription?.length || 0) > 160
                          ? "text-red-500"
                          : "text-gray-400"
                      }`}
                    >
                      {product.seoDescription?.length || 0}/160
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={product.seoDescription || ""}
                    onChange={(e) => setProduct({ ...product, seoDescription: e.target.value })}
                    className="form-input w-full"
                    placeholder={product.description || "Ürün açıklaması"}
                    maxLength={170}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Google Ürün Kategorisi
                  </label>
                  <input
                    type="text"
                    value={product.googleCategory || ""}
                    onChange={(e) => setProduct({ ...product, googleCategory: e.target.value })}
                    className="form-input w-full"
                    placeholder="Giyim ve Aksesuarlar > İç Giyim"
                  />
                </div>

                {/* SEO Preview */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase text-gray-400">Google Önizleme</p>
                  <div className="mt-2">
                    <p className="text-lg text-blue-700 hover:underline">
                      {product.seoTitle || product.name} - Vorte Tekstil
                    </p>
                    <p className="text-sm text-green-700">
                      www.vorte.com.tr/urun/{generatedSlug}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-600">
                      {product.seoDescription ||
                        product.description ||
                        "Ürün açıklaması burada görünecek..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab: Variants */}
        {activeTab === "variants" && (
          <div className="rounded-lg border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Varyantlar</h2>
              <Button size="sm" variant="outline" onClick={addVariant}>
                <Plus className="mr-1 h-3 w-3" /> Varyant Ekle
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 font-medium text-gray-700">Renk</th>
                    <th className="px-3 py-2 font-medium text-gray-700">Hex</th>
                    <th className="px-3 py-2 font-medium text-gray-700">Beden</th>
                    <th className="px-3 py-2 font-medium text-gray-700">SKU</th>
                    <th className="px-3 py-2 font-medium text-gray-700">GTIN</th>
                    <th className="px-3 py-2 font-medium text-gray-700">Stok</th>
                    <th className="px-3 py-2 font-medium text-gray-700">Fiyat (₺)</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {product.variants.map((v, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={v.color}
                          onChange={(e) => updateVariant(i, "color", e.target.value)}
                          className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none"
                          placeholder="Siyah"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="color"
                          value={v.colorHex}
                          onChange={(e) => updateVariant(i, "colorHex", e.target.value)}
                          className="h-8 w-10 cursor-pointer rounded border"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={v.size}
                          onChange={(e) => updateVariant(i, "size", e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none"
                        >
                          {["S", "M", "L", "XL", "XXL"].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) => updateVariant(i, "sku", e.target.value)}
                          className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={v.gtinBarcode}
                          onChange={(e) => updateVariant(i, "gtinBarcode", e.target.value)}
                          className="w-32 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={v.stock}
                          onChange={(e) =>
                            updateVariant(i, "stock", parseInt(e.target.value) || 0)
                          }
                          className="w-16 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={v.price}
                          onChange={(e) => updateVariant(i, "price", e.target.value)}
                          className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none"
                          placeholder="Taban"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeVariant(i)}
                          className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-gray-400">
              Fiyat boş bırakılırsa taban fiyat (satış fiyatı) kullanılır. Kaydettiğinizde
              tüm varyantlar yeniden oluşturulur.
            </p>
          </div>
        )}

        {/* Save */}
        {activeTab === "reviews" && (
          <AdminReviewsTab productId={product.id} />
        )}

        <div className="flex justify-end gap-3">
          <Link href="/admin/urunler">
            <Button variant="outline">İptal</Button>
          </Link>
          <Button onClick={handleSave} loading={saving}>
            <Save className="mr-2 h-4 w-4" />
            Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN REVIEWS TAB
// ============================================================
interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  approved: boolean;
  createdAt: string;
  user: { name: string | null; email: string };
  product: { name: string };
}

function AdminReviewsTab({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReviews = () => {
    setLoading(true);
    fetch(`/api/admin/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((data) => setReviews(data.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleApprove = async (id: string, approved: boolean) => {
    setActionLoading(id);
    try {
      await fetch("/api/admin/reviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approved }),
      });
      fetchReviews();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;
    setActionLoading(id);
    try {
      await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE" });
      fetchReviews();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#7AC143]" />
        </div>
      </div>
    );
  }

  const pending = reviews.filter((r) => !r.approved);
  const approved = reviews.filter((r) => r.approved);

  return (
    <div className="space-y-6">
      {/* Bekleyen Yorumlar */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
          <Star className="h-5 w-5 text-amber-500" />
          Onay Bekleyen ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-500">Bekleyen yorum yok.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((review) => (
              <div
                key={review.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {review.user.name || review.user.email}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  {review.title && (
                    <p className="mt-1 font-medium text-gray-900">{review.title}</p>
                  )}
                  {review.comment && (
                    <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(review.id, true)}
                    disabled={actionLoading === review.id}
                    className="rounded-lg bg-green-600 p-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    title="Onayla"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    disabled={actionLoading === review.id}
                    className="rounded-lg bg-red-600 p-2 text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                    title="Sil"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Onaylı Yorumlar */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-bold text-gray-900">
          Onaylı Yorumlar ({approved.length})
        </h3>
        {approved.length === 0 ? (
          <p className="text-sm text-gray-500">Onaylanmış yorum yok.</p>
        ) : (
          <div className="space-y-3">
            {approved.map((review) => (
              <div
                key={review.id}
                className="flex items-start justify-between gap-4 rounded-lg border p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {review.user.name || review.user.email}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  {review.title && (
                    <p className="mt-1 font-medium text-gray-900">{review.title}</p>
                  )}
                  {review.comment && (
                    <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(review.id, false)}
                    disabled={actionLoading === review.id}
                    className="rounded-lg border p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
                    title="Onayı Kaldır"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    disabled={actionLoading === review.id}
                    className="rounded-lg border p-2 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
