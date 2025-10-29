export default function Loading() {
  return (
    <main className="p-6 animate-pulse space-y-4">
      <div className="h-6 w-40 bg-gray-200 rounded" />
      <div className="h-10 w-full max-w-md bg-gray-200 rounded" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded" />
        ))}
      </div>
    </main>
  );
}
