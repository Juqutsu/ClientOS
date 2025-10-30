import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            Client Portal
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">Preise</Link>
            {user ? (
              <Link href="/dashboard" className="btn-primary text-sm">
                Zum Dashboard
              </Link>
            ) : (
              <Link href="/auth/login" className="rounded-lg border-2 border-gray-200 px-4 py-2 text-sm font-medium hover:border-primary-500 hover:bg-primary-50 transition-all">
                Einloggen
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div className="animate-fade-in">
          <div className="inline-block mb-4 px-4 py-2 bg-gradient-to-r from-primary-100 to-accent-100 rounded-full">
            <span className="text-sm font-semibold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              ✨ Professionelle Projektverwaltung
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-primary-900 to-accent-900 bg-clip-text text-transparent">
            Projekte, Aufgaben und Dateien – alles an einem Ort
          </h1>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            Teile Fortschritt und Dateien mit Kunden, sammle Feedback und halte Deadlines im Blick. Einfache Oberfläche, klare Struktur.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {user ? (
              <Link href="/dashboard" className="btn-primary">
                Zum Dashboard →
              </Link>
            ) : (
              <Link href="/auth/login" className="btn-primary">
                Jetzt starten →
              </Link>
            )}
            <Link href="/pricing" className="btn-outline">
              Preise ansehen
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Kostenlos starten
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Keine Kreditkarte nötig
            </span>
          </div>
        </div>
        <div className="card-gradient p-6 md:p-8 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-200 to-accent-200 rounded-full blur-3xl opacity-50"></div>
          <div className="relative">
            <div className="h-6 w-40 rounded-lg bg-gradient-to-r from-primary-200 to-primary-300 animate-pulse" />
            <div className="mt-6 grid gap-4">
              <div className="h-24 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-32 bg-blue-300 rounded"></div>
                  <div className="h-2 w-24 bg-blue-200 rounded"></div>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-300"></div>
              </div>
              <div className="h-24 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-32 bg-purple-300 rounded"></div>
                  <div className="h-2 w-24 bg-purple-200 rounded"></div>
                </div>
                <div className="h-8 w-8 rounded-full bg-purple-300"></div>
              </div>
              <div className="h-24 rounded-lg bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-32 bg-pink-300 rounded"></div>
                  <div className="h-2 w-24 bg-pink-200 rounded"></div>
                </div>
                <div className="h-8 w-8 rounded-full bg-pink-300"></div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <div className="h-10 w-28 rounded-lg bg-gray-200"></div>
              <div className="h-10 w-28 rounded-lg bg-gradient-to-r from-primary-300 to-accent-300"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Alles was du brauchst
            </h2>
            <p className="mt-3 text-gray-600 text-lg">Leistungsstarke Features für professionelles Projektmanagement</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-gradient p-8 group hover:-translate-y-2">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-2">Projektübersicht</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Alle Projekte mit Kundenname und Status auf einen Blick. Behalte den Überblick über alle laufenden Arbeiten.</p>
            </div>
            <div className="card-gradient p-8 group hover:-translate-y-2">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-2">Aufgabenverwaltung</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Erstelle Aufgaben, wechsle Status und halte Deadlines ein. Organisiere deine Arbeit effizient.</p>
            </div>
            <div className="card-gradient p-8 group hover:-translate-y-2">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-2">Dateifreigabe</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Lade Dateien hoch und teile sie sicher mit Kunden. Einfacher und schneller Datenaustausch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="bg-gradient-to-r from-primary-600 to-accent-600 rounded-2xl p-12 text-center shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Starte kostenlos – Upgrade jederzeit möglich</h2>
          <p className="mt-4 text-primary-100 text-lg max-w-2xl mx-auto">Die Free-Version umfasst bis zu 3 Projekte. Für mehr kannst du später upgraden.</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            {user ? (
              <Link href="/dashboard" className="bg-white text-primary-600 rounded-lg px-8 py-3 font-semibold hover:scale-105 transition-transform shadow-lg">
                Zum Dashboard →
              </Link>
            ) : (
              <Link href="/auth/login" className="bg-white text-primary-600 rounded-lg px-8 py-3 font-semibold hover:scale-105 transition-transform shadow-lg">
                Kostenlos registrieren →
              </Link>
            )}
            <Link href="/pricing" className="border-2 border-white text-white rounded-lg px-8 py-3 font-semibold hover:bg-white/10 transition-all">
              Preise ansehen
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-bold text-xl bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-2">
                Client Portal
              </div>
              <p className="text-sm text-gray-500">© {new Date().getFullYear()} Professionelle Projektverwaltung</p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/pricing" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">Preise</Link>
              <Link href="/auth/login" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
