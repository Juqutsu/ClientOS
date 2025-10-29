import { login, signup, oauth, magicLink, sendPasswordReset } from '@/app/auth/actions';
import AuthToasts from '@/components/AuthToasts';

export default function AuthPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const error = typeof searchParams?.error === 'string' ? searchParams?.error : '';
  const success = typeof searchParams?.success === 'string' ? searchParams?.success : '';

  return (
    <main className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <AuthToasts error={error} success={success} />
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Einloggen</h2>
            <p className="text-sm text-gray-500">Mit E-Mail und Passwort</p>
          </div>
          {error ? <div className="text-sm text-red-600">{decodeURIComponent(error)}</div> : null}
          {success === 'signup' ? <div className="text-sm text-green-600">Bitte E-Mail bestätigen, um dich anzumelden.</div> : null}
          {success === 'magic' ? <div className="text-sm text-green-600">Magic Link wurde gesendet.</div> : null}
          {success === 'reset' ? <div className="text-sm text-green-600">Reset-Link wurde gesendet.</div> : null}
          <form action={login} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">E-Mail</label>
              <input name="email" type="email" required className="mt-1 w-full rounded-md border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Passwort</label>
              <input name="password" type="password" required className="mt-1 w-full rounded-md border px-3 py-2" />
            </div>
            <button type="submit" className="w-full bg-black text-white rounded-md py-2">Einloggen</button>
          </form>
          <div className="grid grid-cols-2 gap-2">
            <form action={async () => oauth('google')}><button type="submit" className="w-full border rounded-md py-2 bg-white hover:bg-gray-50">Google</button></form>
            <form action={async () => oauth('github')}><button type="submit" className="w-full border rounded-md py-2 bg-white hover:bg-gray-50">GitHub</button></form>
          </div>
          <div className="space-y-2">
            <form action={magicLink} className="flex gap-2">
              <input name="email" type="email" placeholder="E-Mail für Magic Link" className="flex-1 rounded-md border px-3 py-2" />
              <button type="submit" className="border rounded-md px-3 py-2 bg-white hover:bg-gray-50">Magic Link</button>
            </form>
            <form action={sendPasswordReset} className="flex gap-2">
              <input name="email" type="email" placeholder="E-Mail für Reset" className="flex-1 rounded-md border px-3 py-2" />
              <button type="submit" className="border rounded-md px-3 py-2 bg-white hover:bg-gray-50">Passwort vergessen?</button>
            </form>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Registrieren</h2>
          <p className="text-sm text-gray-500 mb-4">Neue Organisation wird automatisch erstellt</p>
          <form action={signup} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input name="full_name" type="text" placeholder="Max Mustermann" className="mt-1 w-full rounded-md border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">E-Mail</label>
              <input name="email" type="email" required className="mt-1 w-full rounded-md border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Passwort</label>
              <input name="password" type="password" required className="mt-1 w-full rounded-md border px-3 py-2" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white rounded-md py-2">Registrieren</button>
          </form>
        </div>
      </div>
    </main>
  );
}
