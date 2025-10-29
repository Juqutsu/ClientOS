import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg">Client Portal</Link>
          <nav className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-gray-700 hover:text-black">Preise</Link>
            {user ? (
              <Link href="/dashboard" className="rounded-md bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-900">
                Zum Dashboard
              </Link>
            ) : (
              <Link href="/auth/login" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
                Einloggen
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Projekte, Aufgaben und Dateien – alles an einem Ort
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Teile Fortschritt und Dateien mit Kunden, sammle Feedback und halte Deadlines im Blick. Einfache Oberfläche, klare Struktur.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="rounded-md bg-black text-white px-5 py-2.5 hover:bg-gray-900">
                Zum Dashboard
              </Link>
            ) : (
              <Link href="/auth/login" className="rounded-md bg-black text-white px-5 py-2.5 hover:bg-gray-900">
                Jetzt starten
              </Link>
            )}
            <Link href="/pricing" className="rounded-md border px-5 py-2.5 hover:bg-gray-50">
              Preise ansehen
            </Link>
          </div>
          <div className="mt-6 text-sm text-gray-500">Kostenlos starten • Keine Kreditkarte nötig</div>
        </div>
        <div className="border rounded-xl p-4 md:p-6 shadow-sm bg-white">
          <div className="h-6 w-40 rounded bg-gray-100" />
          <div className="mt-4 grid gap-3">
            <div className="h-20 rounded bg-gray-100" />
            <div className="h-20 rounded bg-gray-100" />
            <div className="h-20 rounded bg-gray-100" />
          </div>
          <div className="mt-6 flex items-center justify-end gap-2">
            <div className="h-8 w-28 rounded bg-gray-100" />
            <div className="h-8 w-28 rounded bg-gray-200" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 border-y">
        <div className="mx-auto max-w-6xl px-4 py-14 grid md:grid-cols-3 gap-6">
          <div className="rounded-lg bg-white p-6 border">
            <h3 className="font-semibold">Projektübersicht</h3>
            <p className="mt-2 text-sm text-gray-600">Alle Projekte mit Kundenname und Status auf einen Blick.</p>
          </div>
          <div className="rounded-lg bg-white p-6 border">
            <h3 className="font-semibold">Aufgabenverwaltung</h3>
            <p className="mt-2 text-sm text-gray-600">Erstelle Aufgaben, wechsle Status und halte Deadlines ein.</p>
          </div>
          <div className="rounded-lg bg-white p-6 border">
            <h3 className="font-semibold">Dateifreigabe</h3>
            <p className="mt-2 text-sm text-gray-600">Lade Dateien hoch und teile sie sicher mit Kunden.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold">Starte kostenlos – Upgrade jederzeit möglich</h2>
        <p className="mt-2 text-gray-600">Die Free-Version umfasst bis zu 3 Projekte. Für mehr kannst du später upgraden.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {user ? (
            <Link href="/dashboard" className="rounded-md bg-black text-white px-5 py-2.5 hover:bg-gray-900">
              Zum Dashboard
            </Link>
          ) : (
            <Link href="/auth/login" className="rounded-md bg-black text-white px-5 py-2.5 hover:bg-gray-900">
              Kostenlos registrieren
            </Link>
          )}
          <Link href="/pricing" className="rounded-md border px-5 py-2.5 hover:bg-gray-50">Preise</Link>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-500 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Client Portal</span>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="hover:text-gray-700">Preise</Link>
            <Link href="/auth/login" className="hover:text-gray-700">Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
