import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { DealerAddToCart } from "./DealerAddToCart";

export default async function DealerProductsPage() {
  const dealer = await getDealerSession();
  if (!dealer) return null;

  const products = await db.product.findMany({
    where: { active: true },
    include: {
      category: true,
      variants: { where: { active: true }, orderBy: { size: "asc" } },
      dealerPrices: {
        where: {
          OR: [{ dealerId: dealer.id }, { dealerId: null }],
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Ürün Kataloğu</h1>
      <p className="mt-1 text-sm text-gray-500">Toptan fiyatlarla ürünleriniz</p>

      <div className="mt-6 space-y-6">
        {products.map((product) => {
          // Find dealer-specific price first, then general wholesale price
          const dealerSpecific = product.dealerPrices.find((p) => p.dealerId === dealer.id);
          const generalWholesale = product.dealerPrices.find((p) => p.dealerId === null);
          const wholesalePrice = dealerSpecific?.wholesalePrice || generalWholesale?.wholesalePrice;
          const discount = wholesalePrice
            ? Math.round((1 - wholesalePrice / product.basePrice) * 100)
            : 0;

          // Group variants by color
          const colorGroups = product.variants.reduce<Record<string, typeof product.variants>>((acc, v) => {
            if (!acc[v.color]) acc[v.color] = [];
            acc[v.color].push(v);
            return acc;
          }, {});

          return (
            <div key={product.id} className="rounded-lg border bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
                  <p className="text-sm text-gray-500">{product.category.name}</p>
                </div>
                <div className="text-right">
                  {wholesalePrice ? (
                    <>
                      <p className="text-sm text-gray-400 line-through">
                        Perakende: {formatPrice(product.basePrice)}
                      </p>
                      <p className="text-xl font-bold text-[#7AC143]">
                        {formatPrice(wholesalePrice)}
                      </p>
                      <Badge variant="discount" className="text-[10px]">%{discount} indirim</Badge>
                    </>
                  ) : (
                    <p className="text-xl font-bold text-gray-900">{formatPrice(product.basePrice)}</p>
                  )}
                </div>
              </div>

              {/* Variants table by color */}
              <div className="mt-4 space-y-4">
                {Object.entries(colorGroups).map(([color, variants]) => (
                  <div key={color}>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: variants[0].colorHex }}
                      />
                      <span className="text-sm font-medium text-gray-700">{color}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-xs font-medium text-gray-500">Beden</th>
                            <th className="px-3 py-2 text-xs font-medium text-gray-500">SKU</th>
                            <th className="px-3 py-2 text-xs font-medium text-gray-500">GTIN</th>
                            <th className="px-3 py-2 text-xs font-medium text-gray-500">Stok</th>
                            <th className="px-3 py-2 text-xs font-medium text-gray-500">Adet</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {variants.map((v) => (
                            <tr key={v.id} className={v.stock === 0 ? "bg-red-50 opacity-60" : ""}>
                              <td className="px-3 py-2 font-medium">{v.size}</td>
                              <td className="px-3 py-2 font-mono text-xs text-gray-500">{v.sku}</td>
                              <td className="px-3 py-2 font-mono text-xs text-gray-500">{v.gtinBarcode || "—"}</td>
                              <td className="px-3 py-2">
                                <span className={
                                  v.stock === 0 ? "text-red-600 font-medium" :
                                  v.stock <= 5 ? "text-orange-600" : "text-green-600"
                                }>
                                  {v.stock}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <DealerAddToCart
                                  productId={product.id}
                                  variantId={v.id}
                                  maxStock={v.stock}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {products.length === 0 && (
          <div className="py-12 text-center text-gray-400">Ürün bulunamadı</div>
        )}
      </div>
    </div>
  );
}
