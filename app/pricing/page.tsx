export default function PricingPage() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center">Preise</h1>
        <p className="text-center text-gray-600 mt-2">Einfach, transparent, fair.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <div className="border rounded-xl p-6 bg-white">
            <h2 className="text-xl font-semibold">Free</h2>
            <p className="text-gray-600 mt-1">Bis zu 3 Projekte</p>
            <ul className="text-sm mt-4 space-y-2 text-gray-700 list-disc list-inside">
              <li>Projekte, Aufgaben, Dateien</li>
              <li>Öffentliche Share-Links</li>
            </ul>
            <a href="/dashboard" className="inline-block mt-6 px-4 py-2 rounded-md border hover:bg-gray-50">Loslegen</a>
          </div>

          <div className="border rounded-xl p-6 bg-white">
            <h2 className="text-xl font-semibold">Pro</h2>
            <p className="text-gray-600 mt-1">Unbegrenzte Projekte</p>
            <ul className="text-sm mt-4 space-y-2 text-gray-700 list-disc list-inside">
              <li>Alles aus Free</li>
              <li>Unbegrenzte Projekte</li>
              <li>Priorisierter Support</li>
            </ul>
            <a href="/settings/billing" className="inline-block mt-6 px-4 py-2 rounded-md bg-black text-white">Upgrade</a>
          </div>
        </div>
      </div>
    </main>
  );
}
