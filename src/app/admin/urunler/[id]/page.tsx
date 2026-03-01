"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

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
  description: string;
  categoryId: string;
  gender: string;
  basePrice: number;
  images: string[];
  active: boolean;
  featured: boolean;
  variants: Variant[];
}

export default function AdminProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<ProductData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/products/${productId}`).then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
    ]).then(([prod, cats]) => {
      setProduct(prod);
      setCategories(cats);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      if (res.ok) {
        router.push("/admin/urunler");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <Link href="/admin/urunler" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ürün Düzenle</h1>
          <p className="text-sm text-gray-500">{product.name}</p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Temel Bilgiler</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ürün Adı</label>
              <input
                type="text"
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Kategori</label>
              <select
                value={product.categoryId}
                onChange={(e) => setProduct({ ...product, categoryId: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Taban Fiyat (₺)</label>
              <input
                type="number"
                step="0.01"
                value={product.basePrice}
                onChange={(e) => setProduct({ ...product, basePrice: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Cinsiyet</label>
              <select
                value={product.gender}
                onChange={(e) => setProduct({ ...product, gender: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
              >
                <option value="ERKEK">Erkek</option>
                <option value="KADIN">Kadın</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Açıklama</label>
              <textarea
                rows={3}
                value={product.description || ""}
                onChange={(e) => setProduct({ ...product, description: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
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

        {/* Variants */}
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
                  <th className="px-3 py-2 font-medium text-gray-700">Fiyat</th>
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
                        className="w-20 rounded border px-2 py-1 text-sm"
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
                        className="rounded border px-2 py-1 text-sm"
                      >
                        {["S", "M", "L", "XL", "XXL"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => updateVariant(i, "sku", e.target.value)}
                        className="w-28 rounded border px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={v.gtinBarcode}
                        onChange={(e) => updateVariant(i, "gtinBarcode", e.target.value)}
                        className="w-32 rounded border px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={v.stock}
                        onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value) || 0)}
                        className="w-16 rounded border px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={v.price}
                        onChange={(e) => updateVariant(i, "price", e.target.value)}
                        className="w-20 rounded border px-2 py-1 text-sm"
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
        </div>

        {/* Save */}
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
