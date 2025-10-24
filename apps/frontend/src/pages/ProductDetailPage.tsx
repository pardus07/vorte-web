/**
 * Product detail page with add to cart.
 */
import { useParams } from 'react-router-dom';
import { useProductBySlug } from '@/lib/api/products';
import { useAddToCart } from '@/lib/api/cart';
import { ErrorDisplay } from '@/components/ErrorDisplay';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading, error, refetch } = useProductBySlug(slug!);
  const addToCart = useAddToCart();
  
  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      await addToCart.mutateAsync({
        product_id: product.id,
        qty: 1,
      });
      
      alert('Added to cart!');
    } catch (error) {
      // Error handled by ErrorDisplay
    }
  };
  
  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="animate-pulse">
          <div className="aspect-square w-full max-w-lg rounded-lg bg-gray-200"></div>
          <div className="mt-4 h-8 w-2/3 rounded bg-gray-200"></div>
          <div className="mt-2 h-4 w-1/3 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="mx-auto max-w-7xl">
        <ErrorDisplay error={error as any} onRetry={() => refetch()} />
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="mx-auto max-w-7xl text-center">
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }
  
  const imageUrl = product.images?.[0]?.url || '/placeholder.png';
  const imageAlt = product.images?.[0]?.alt || product.name;
  
  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
            <img
              src={imageUrl}
              alt={imageAlt}
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <p className="mt-2 text-sm text-gray-500">SKU: {product.sku}</p>
          
          <div className="mt-4">
            <p className="text-3xl font-bold text-gray-900">
              ₺{product.price.toFixed(2)}
            </p>
          </div>
          
          {product.description && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-gray-900">Description</h2>
              <p className="mt-2 text-sm text-gray-600">{product.description}</p>
            </div>
          )}
          
          <div className="mt-8">
            {addToCart.error && (
              <div className="mb-4">
                <ErrorDisplay 
                  error={addToCart.error as any} 
                  onRetry={() => addToCart.reset()}
                />
              </div>
            )}
            
            <button
              onClick={handleAddToCart}
              disabled={addToCart.isPending || product.status !== 'active'}
              className="w-full rounded-md bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
