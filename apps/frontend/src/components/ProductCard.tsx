/**
 * Product card component with accessibility.
 */
import { Link } from 'react-router-dom';
import { Product } from '@/lib/api/products';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.images?.[0]?.url || '/placeholder.png';
  const imageAlt = product.images?.[0]?.alt || product.name;
  
  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      aria-label={`View ${product.name}`}
    >
      <div className="aspect-square overflow-hidden rounded-md bg-gray-100">
        <img
          src={imageUrl}
          alt={imageAlt}
          className="h-full w-full object-cover object-center group-hover:opacity-75"
          loading="lazy"
        />
      </div>
      
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
        <p className="mt-1 text-sm text-gray-500">{product.sku}</p>
        <p className="mt-2 text-lg font-semibold text-gray-900">
          ₺{product.price.toFixed(2)}
        </p>
      </div>
    </Link>
  );
}
