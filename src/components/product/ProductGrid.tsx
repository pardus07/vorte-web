import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    images: string[];
    featured: boolean;
    category: { name: string };
    variants: {
      id: string;
      color: string;
      colorHex: string;
      size: string;
      stock: number;
      price: number | null;
    }[];
  }[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-600">Ürün bulunamadı</p>
          <p className="mt-1 text-sm text-gray-400">
            Filtrelerinizi değiştirmeyi deneyin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
