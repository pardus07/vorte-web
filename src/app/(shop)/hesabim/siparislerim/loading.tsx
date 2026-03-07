export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
          </div>
          <div className="flex gap-4">
            <div className="h-16 w-16 animate-pulse rounded bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
