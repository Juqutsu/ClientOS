import { requireUser } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = getSupabaseServer();

  const { data: profile } = await supabase
    .from('users')
    .select('email, full_name')
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
    </main>
  );
}
