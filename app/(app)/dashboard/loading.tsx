export default function Loading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-10 w-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-3" />
            <div className="h-4 w-96 bg-gray-200 rounded" />
          </div>

          {/* Form skeleton */}
          <div className="card-gradient p-6">
            <div className="h-6 w-48 bg-gray-300 rounded mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-12 bg-gray-200 rounded-lg" />
              <div className="h-12 bg-gray-200 rounded-lg" />
              <div className="md:col-span-2 h-12 bg-gray-200 rounded-lg" />
              <div className="md:col-span-2 h-12 bg-gradient-to-r from-primary-200 to-primary-300 rounded-lg" />
            </div>
          </div>

          {/* Cards skeleton */}
          <div className="h-6 w-48 bg-gray-300 rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card-gradient p-6 h-40 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
