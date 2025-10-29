"use client";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Etwas ist schiefgelaufen</h1>
      <p className="text-gray-600">{error.message}</p>
      <button onClick={reset} className="px-3 py-2 rounded-md border bg-white hover:bg-gray-50">Erneut versuchen</button>
    </main>
  );
}
