export default function Loading() {
  return (
    <main className="p-6 animate-pulse">
      <div className="h-6 w-40 bg-gray-200 rounded" />
      <div className="mt-4 h-4 w-80 bg-gray-200 rounded" />
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 border rounded-lg bg-white" />
        ))}
      </div>
    </main>
  );
}
