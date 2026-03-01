import Link from "next/link";
import { db } from "@/lib/db";
import { Plus, Edit, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";

export default async function AdminProductsPage() {
  const products = await db.product.findMany({
    include: {
      category: true,
      variants: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ürünler</h1>
          <p className="mt-1 text-sm text-gray-500">{products.length} ürün</p>
        </div>
        <Link href="/admin/urunler/yeni">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Ürün
          </Button>
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Ürün</th>
              <th className="px-4 py-3 font-medium text-gray-700">Kategori</th>
              <th className="px-4 py-3 font-medium text-gray-700">Fiyat</th>
              <th className="px-4 py-3 font-medium text-gray-700">Stok</th>
              <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
              <th className="px-4 py-3 font-medium text-gray-700">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => {
              const totalStock = product.variants.reduce(
                (sum, v) => sum + v.stock,
                0
              );
              const variantCount = product.variants.length;

              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {variantCount} varyant
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {product.category.name}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatPrice(product.basePrice)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        totalStock === 0
                          ? "text-red-600 font-medium"
                          : totalStock <= 10
                            ? "text-orange-600"
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
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/urun/${product.slug}`}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Görüntüle"
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
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Henüz ürün eklenmemiş
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
