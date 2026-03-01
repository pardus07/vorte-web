"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

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

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    gender: "ERKEK" as "ERKEK" | "KADIN",
    basePrice: "",
    featured: false,
  });

  const [variants, setVariants] = useState<VariantRow[]>([
    { color: "", colorHex: "#000000", size: "S", sku: "", gtinBarcode: "", stock: 0, price: "" },
  ]);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || []))
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

  return (
    <div>
      <div className="flex items-center gap-4">
        <Link href="/admin/urunler" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Yeni Ürün</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* Basic info */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Temel Bilgiler</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Ürün Adı *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                placeholder="Erkek Boxer Premium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Açıklama
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Cinsiyet *
              </label>
              <select
                value={form.gender}
                onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value as "ERKEK" | "KADIN" }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
              >
                <option value="ERKEK">Erkek</option>
                <option value="KADIN">Kadın</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Kategori *
              </label>
              <select
                required
                value={form.categoryId}
                onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
              >
                <option value="">Seçin...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.gender})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Temel Fiyat (₺) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={form.basePrice}
                onChange={(e) => setForm((p) => ({ ...p, basePrice: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
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

        {/* Variants */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Varyantlar</h2>
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              <Plus className="mr-1 h-4 w-4" />
              Ekle
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {variants.map((v, i) => (
              <div key={i} className="grid gap-2 rounded border p-3 sm:grid-cols-7">
                <input
                  type="text"
                  required
                  placeholder="Renk"
                  value={v.color}
                  onChange={(e) => updateVariant(i, "color", e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="color"
                  value={v.colorHex}
                  onChange={(e) => updateVariant(i, "colorHex", e.target.value)}
                  className="h-9 w-full rounded border border-gray-300"
                />
                <select
                  value={v.size}
                  onChange={(e) => updateVariant(i, "size", e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                >
                  {["S", "M", "L", "XL", "XXL"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  placeholder="SKU"
                  value={v.sku}
                  onChange={(e) => updateVariant(i, "sku", e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="text"
                  placeholder="GTIN"
                  value={v.gtinBarcode}
                  onChange={(e) => updateVariant(i, "gtinBarcode", e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Stok"
                  value={v.stock}
                  onChange={(e) => updateVariant(i, "stock", e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Fiyat"
                    value={v.price}
                    onChange={(e) => updateVariant(i, "price", e.target.value)}
                    className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      className="rounded p-1.5 text-red-400 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={loading}>
            <Save className="mr-2 h-4 w-4" />
            Ürünü Kaydet
          </Button>
          <Link href="/admin/urunler">
            <Button type="button" variant="outline">İptal</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
