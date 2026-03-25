import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { Plus, Edit, Eye, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
    status?: string;
    stock?: string;
  }>;
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1"));
  const limit = 20;
  const search = sp.search || "";
  const categoryId = sp.category || "";
  const status = sp.status || "";
  const stockStatus = sp.stock || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { variants: { some: { sku: { contains: search, mode: "insensitive" } } } },
    ];
  }

  if (categoryId) where.categoryId = categoryId;
  if (status === "active") where.active = true;
  else if (status === "inactive") where.active = false;

  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: true, variants: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  // Stock filter (post-query since it's aggregate)
  let filtered = products;
  if (stockStatus === "out_of_stock") {
    filtered = products.filter((p) => p.variants.reduce((s, v) => s + v.stock, 0) === 0);
  } else if (stockStatus === "low") {
    filtered = products.filter((p) => {
      const t = p.variants.reduce((s, v) => s + v.stock, 0);
      return t > 0 && t <= 10;
    });
  } else if (stockStatus === "in_stock") {
    filtered = products.filter((p) => p.variants.reduce((s, v) => s + v.stock, 0) > 0);
  }

  const totalPages = Math.ceil(total / limit);

  // URL builder helper
  function buildUrl(overrides: Record<string, string | number | undefined>) {
    const p = new URLSearchParams();
    const vals: Record<string, string> = {
      page: String(page),
      search,
      category: categoryId,
      status,
      stock: stockStatus,
    };
    for (const [k, v] of Object.entries({ ...vals, ...overrides })) {
      const s = String(v || "");
      if (s && s !== "0") p.set(k, s);
    }
    const qs = p.toString();
    return `/admin/urunler${qs ? `?${qs}` : ""}`;
  }

  const hasFilters = search || categoryId || status || stockStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Ürünler</h1>
          <p className="mt-1 text-[13px] text-gray-500">{total} ürün kayıtlı</p>
        </div>
        <Link href="/admin/urunler/yeni">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Ürün
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <form className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">Ara</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="search"
                type="text"
                defaultValue={search}
                placeholder="Ürün adı, slug veya SKU..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
              />
            </div>
          </div>

          {/* Category */}
          <div className="w-44">
            <label className="mb-1 block text-xs font-medium text-gray-500">Kategori</label>
            <select
              name="category"
              defaultValue={categoryId}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
            >
              <option value="">Tümü</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="w-36">
            <label className="mb-1 block text-xs font-medium text-gray-500">Durum</label>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
            >
              <option value="">Tümü</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </select>
          </div>

          {/* Stock */}
          <div className="w-36">
            <label className="mb-1 block text-xs font-medium text-gray-500">Stok</label>
            <select
              name="stock"
              defaultValue={stockStatus}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
            >
              <option value="">Tümü</option>
              <option value="in_stock">Stokta</option>
              <option value="low">Düşük (≤10)</option>
              <option value="out_of_stock">Tükendi</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              <Search className="mr-1 h-3.5 w-3.5" />
              Filtrele
            </Button>
            {hasFilters && (
              <Link href="/admin/urunler">
                <Button type="button" variant="outline" size="sm">
                  <X className="mr-1 h-3.5 w-3.5" />
                  Temizle
                </Button>
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50/80">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Ürün</th>
              <th className="px-4 py-3 font-medium text-gray-700">Kategori</th>
              <th className="px-4 py-3 font-medium text-gray-700">Fiyat</th>
              <th className="px-4 py-3 font-medium text-gray-700">Maliyet</th>
              <th className="px-4 py-3 font-medium text-gray-700">Stok</th>
              <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
              <th className="px-4 py-3 font-medium text-gray-700">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((product) => {
              const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
              const variantCount = product.variants.length;
              const thumbnail = product.images?.[0];

              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {thumbnail ? (
                        <Image
                          src={thumbnail}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-gray-100 text-xs text-gray-400">
                          IMG
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">
                          {variantCount} varyant · {product.gender}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{product.category.name}</td>
                  <td className="px-4 py-3 font-medium">{formatPrice(product.basePrice)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {product.costPrice ? formatPrice(product.costPrice) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        totalStock === 0
                          ? "font-medium text-red-600"
                          : totalStock <= 10
                            ? "font-medium text-orange-600"
                            : "text-gray-600"
                      }
                    >
                      {totalStock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {product.active ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="outline">Pasif</Badge>
                    )}
                    {product.featured && (
                      <Badge variant="new" className="ml-1">Öne Çıkan</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/urun/${product.slug}`}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Mağazada Gör"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/admin/urunler/${product.id}`}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Düzenle"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  {hasFilters ? "Filtrelerle eşleşen ürün bulunamadı" : "Henüz ürün eklenmemiş"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Sayfa {page} / {totalPages} · Toplam {total} ürün
          </p>
          <div className="flex items-center gap-1">
            {page > 1 && (
              <Link
                href={buildUrl({ page: page - 1 })}
                className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                ← Önceki
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | "dots")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("dots");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "dots" ? (
                  <span key={`dots-${idx}`} className="px-2 text-sm text-gray-400">
                    …
                  </span>
                ) : (
                  <Link
                    key={item}
                    href={buildUrl({ page: item })}
                    className={`rounded-lg px-3 py-1.5 text-sm ${
                      item === page
                        ? "bg-[#1A1A1A] text-white"
                        : "border text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item}
                  </Link>
                )
              )}
            {page < totalPages && (
              <Link
                href={buildUrl({ page: page + 1 })}
                className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Sonraki →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
