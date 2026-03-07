export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 h-8 w-32 animate-pulse rounded bg-gray-200" />
      <div className="grid gap-6 md:grid-cols-3">
        {/* Sidebar */}
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded bg-gray-100" />
          ))}
        </div>
        {/* Content */}
        <div className="md:col-span-2 space-y-4">
          <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
          <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
