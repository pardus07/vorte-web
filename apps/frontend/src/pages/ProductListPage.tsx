/**
 * Product listing page with filters and pagination.
 */
import { useState } from 'react';
import { useProducts } from '@/lib/api/products';
import { ProductCard } from '@/components/ProductCard';
import { Pagination } from '@/components/Pagination';
import { ErrorDisplay } from '@/components/ErrorDisplay';

export function ProductListPage() {
  const [cursor, setCursor] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  
  const { data, isLoading, error, refetch } = useProducts({
    q: search || undefined,
    cursor,
    limit: 12,
  });
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCursor(undefined); // Reset pagination
    refetch();
  };
  
  if (error) {
    return (
      <div className="mx-auto max-w-7xl">
        <ErrorDisplay error={error as any} onRetry={() => refetch()} />
      </div>
    );
  }
  
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        
        <form onSubmit={handleSearch} className="mt-4">
          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
              aria-label="Search products"
            />
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Search
            </button>
          </div>
        </form>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square rounded-lg bg-gray-200"></div>
              <div className="mt-4 h-4 rounded bg-gray-200"></div>
              <div className="mt-2 h-4 w-2/3 rounded bg-gray-200"></div>
            </div>
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data?.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          
          <div className="mt-8">
            <Pagination
              nextCursor={data?.nextCursor}
              prevCursor={data?.prevCursor}
              onNext={() => setCursor(data?.nextCursor)}
              onPrev={() => setCursor(data?.prevCursor)}
              isLoading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}
