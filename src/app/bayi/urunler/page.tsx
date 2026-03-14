import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";
import { DealerProductGrid } from "./DealerProductGrid";
import { StandPackageSection } from "./StandPackageSection";

export default async function DealerProductsPage() {
  const dealer = await getDealerSession();
  if (!dealer) return null;

  const products = await db.product.findMany({
    where: { active: true },
    include: {
      category: true,
      variants: { where: { active: true }, orderBy: [{ color: "asc" }, { size: "asc" }] },
      dealerPrices: {
        where: {
          OR: [{ dealerId: dealer.id }, { dealerId: null }],
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Wholesale prices by product slug — stand paketleri için
  const wholesalePricesBySlug: Record<string, number> = {};

  // Serialize products for client component
  const serializedProducts = products.map((product) => {
    const dealerSpecific = product.dealerPrices.find((p) => p.dealerId === dealer.id);
    const generalWholesale = product.dealerPrices.find((p) => p.dealerId === null);
    const wholesalePrice = dealerSpecific?.wholesalePrice || generalWholesale?.wholesalePrice || product.basePrice;
    const discount = wholesalePrice
      ? Math.round((1 - wholesalePrice / product.basePrice) * 100)
      : 0;

    // Stand fiyat map'e ekle
    wholesalePricesBySlug[product.slug] = wholesalePrice;

    // Group variants by color
    const colorGroups: Record<string, { color: string; colorHex: string; variants: { id: string; size: string; stock: number }[] }> = {};
    for (const v of product.variants) {
      if (!colorGroups[v.color]) {
        colorGroups[v.color] = { color: v.color, colorHex: v.colorHex, variants: [] };
      }
      colorGroups[v.color].variants.push({ id: v.id, size: v.size, stock: v.stock });
    }

    return {
      id: product.id,
      name: product.name,
      image: (product.images as string[])[0] || null,
      retailPrice: product.basePrice,
      wholesalePrice,
      discount,
      colorGroups: Object.values(colorGroups),
    };
  });

  return (
    <div>
      {/* Stand Paketleri */}
      <StandPackageSection wholesalePrices={wholesalePricesBySlug} />

      {/* Tekil Ürünler */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ürün Kataloğu</h1>
          <p className="mt-1 text-sm text-gray-500">Toptan fiyatlarla ürünleriniz — minimum alım 1 düzine (12 adet)</p>
        </div>
      </div>

      <DealerProductGrid products={serializedProducts} />

      {products.length === 0 && (
        <div className="py-12 text-center text-gray-400">Ürün bulunamadı</div>
      )}
    </div>
  );
}
