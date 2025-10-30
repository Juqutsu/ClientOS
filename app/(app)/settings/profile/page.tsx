import { requireUser } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import AvatarUpload from '@/components/AvatarUpload';
import { createClient } from '@supabase/supabase-js';

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = getSupabaseServer();

  const { data: profile } = await supabase
    .from('users')
    .select('email, full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  async function updateProfile(formData: FormData) {
    'use server';
    const supabase = getSupabaseServer();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    const fullName = String(formData.get('full_name') || '').trim();
    await supabase.from('users').upsert({ id: userRes.user.id, full_name: fullName, email: userRes.user.email });
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-primary-900 bg-clip-text text-transparent">Profil</h1>
          <p className="text-gray-600 mt-2">Verwalte deine persönlichen Informationen</p>
        </div>

        <div className="card-gradient p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Persönliche Daten
          </h2>
          <form action={updateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">E-Mail</label>
              <input readOnly value={profile?.email || user.email || ''} className="input-field bg-gray-100 cursor-not-allowed" />
              <p className="text-xs text-gray-500 mt-1">Deine E-Mail-Adresse kann nicht geändert werden</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
              <input name="full_name" defaultValue={profile?.full_name || ''} placeholder="Dein vollständiger Name" className="input-field" />
            </div>
            <button type="submit" className="btn-primary">Änderungen speichern</button>
          </form>
        </div>

        <div className="card-gradient p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Profilbild
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Avatar" className="h-24 w-24 rounded-full object-cover border-4 border-primary-200 shadow-lg" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary-200 to-accent-200 flex items-center justify-center">
                  <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <AvatarUpload />
              <p className="text-xs text-gray-500 mt-2">JPG, PNG oder GIF (max. 2MB)</p>
            </div>
          </div>
        </div>

        <div className="card-gradient p-8 border-2 border-red-200">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Gefahrenzone
          </h2>
          <p className="text-sm text-gray-600 mb-4">Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten werden permanent gelöscht.</p>
          <form action={deleteAccount}>
            <button type="submit" className="px-6 py-2.5 rounded-lg border-2 border-red-600 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all font-semibold">
              Konto unwiderruflich löschen
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

async function deleteAccount() {
  'use server';
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  // Avoid FK constraint on workspaces.created_by
  await admin.from('workspaces').update({ created_by: null }).eq('created_by', user.id);
  await admin.from('users').delete().eq('id', user.id);
  await admin.auth.admin.deleteUser(user.id);
}
