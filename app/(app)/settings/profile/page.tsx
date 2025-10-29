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
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Profil</h1>
      <form action={updateProfile} className="space-y-3 max-w-md">
        <div>
          <label className="block text-sm font-medium">E-Mail</label>
          <input readOnly value={profile?.email || user.email || ''} className="mt-1 w-full rounded-md border px-3 py-2 bg-gray-50" />
        </div>
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input name="full_name" defaultValue={profile?.full_name || ''} placeholder="Dein Name" className="mt-1 w-full rounded-md border px-3 py-2" />
        </div>
        <button type="submit" className="px-4 py-2 rounded-md bg-black text-white">Speichern</button>
      </form>

      <section className="max-w-md">
        <h2 className="font-semibold mb-2">Avatar</h2>
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="Avatar" className="h-16 w-16 rounded-full object-cover border" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gray-200" />
          )}
          <AvatarUpload />
        </div>
      </section>

      <section className="max-w-md">
        <h2 className="font-semibold mb-2">Konto</h2>
        <form action={deleteAccount}>
          <button type="submit" className="px-4 py-2 rounded-md border border-red-600 text-red-600 hover:bg-red-50">Konto löschen</button>
        </form>
      </section>
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
