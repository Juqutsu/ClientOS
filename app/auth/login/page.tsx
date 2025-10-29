import { login, signup } from '@/app/auth/actions';

export default function AuthPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Einloggen</h2>
          <p className="text-sm text-gray-500 mb-4">Mit E-Mail und Passwort</p>
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
