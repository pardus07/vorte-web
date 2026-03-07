export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 h-4 w-64 animate-pulse rounded bg-gray-200" />
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image gallery */}
        <div>
          <div className="aspect-square animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-4 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 w-20 animate-pulse rounded bg-gray-200" />
            ))}
          </div>
        </div>
        {/* Product info */}
        <div className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-px bg-gray-200" />
          <div className="space-y-2">
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 w-14 animate-pulse rounded bg-gray-200" />
              ))}
            </div>
          </div>
          <div className="h-12 w-full animate-pulse rounded-lg bg-gray-300" />
        </div>
      </div>
    </div>
  );
}
