export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 skeleton rounded-xl" />
        <div className="h-4 w-72 skeleton rounded-lg" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden space-y-2">
            <div className="aspect-[2/3] skeleton rounded-xl" />
            <div className="h-3 skeleton rounded w-3/4 mt-2" />
            <div className="h-3 skeleton rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
