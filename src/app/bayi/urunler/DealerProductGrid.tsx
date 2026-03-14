"use client";

import Image from "next/image";
import { DealerAddToCart } from "./DealerAddToCart";

interface ColorGroup {
  color: string;
  colorHex: string;
  variants: { id: string; size: string; stock: number }[];
}

interface Product {
  id: string;
  name: string;
  image: string | null;
  retailPrice: number;
  wholesalePrice: number;
  discount: number;
  colorGroups: ColorGroup[];
}

export function DealerProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <DealerProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function DealerProductCard({ product }: { product: Product }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Product Image */}
      <div className="relative aspect-square bg-gray-50">
        {product.image ? (
          <Image
            src={`/images/${product.image}`}
            alt={product.name}
            fill
            className="object-contain p-4"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {product.discount > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-[#7AC143] px-2.5 py-1 text-xs font-bold text-white">
            %{product.discount} İndirim
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="text-base font-bold text-gray-900">{product.name}</h3>

        {/* Pricing */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold text-[#7AC143]">
            {product.wholesalePrice.toFixed(2)} ₺
          </span>
          {product.discount > 0 && (
            <span className="text-sm text-gray-400 line-through">
              {product.retailPrice.toFixed(2)} ₺
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-400">Toptan birim fiyat (KDV dahil)</p>

        {/* Color Groups — each color has its own add to cart */}
        <div className="mt-4 space-y-4">
          {product.colorGroups.map((cg) => (
            <div key={cg.color} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="h-4 w-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: cg.colorHex }}
                />
                <span className="text-sm font-medium text-gray-700">{cg.color}</span>
              </div>
              <DealerAddToCart
                productId={product.id}
                variants={cg.variants}
                wholesalePrice={product.wholesalePrice}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
