import { updatePassword } from '@/app/auth/actions';

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Neues Passwort setzen</h2>
        <p className="text-sm text-gray-500 mb-4">Du hast dich über den Wiederherstellungslink angemeldet.</p>
        <form action={updatePassword} className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Neues Passwort</label>
            <input name="password" type="password" required minLength={8} className="mt-1 w-full rounded-md border px-3 py-2" />
          </div>
          <button type="submit" className="w-full bg-black text-white rounded-md py-2">Passwort speichern</button>
        </form>
      </div>
    </main>
  );
}
