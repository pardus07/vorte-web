export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Hero banner skeleton */}
      <div className="mb-8 h-48 animate-pulse rounded-lg bg-gray-200" />
      
      {/* Breadcrumb */}
      <div className="mb-6 h-4 w-48 animate-pulse rounded bg-gray-200" />
      
      <div className="flex gap-8">
        {/* Filter sidebar skeleton */}
        <div className="hidden w-64 shrink-0 lg:block">
          <div className="space-y-6">
            <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded bg-gray-100" />
              ))}
            </div>
            <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 w-16 animate-pulse rounded-full bg-gray-100" />
              ))}
            </div>
          </div>
        </div>

        {/* Product grid skeleton */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-9 w-40 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square animate-pulse rounded-lg bg-gray-200" />
                <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
