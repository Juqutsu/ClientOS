import { requireUser } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import type React from 'react';

export default async function WorkspaceSettingsPage() {
  await requireUser();
  const supabase = getSupabaseServer();

  const cookieStore = cookies();
  const activeCookie = cookieStore.get('active_ws')?.value || null;
  let wsId = activeCookie as string | null;
  if (!wsId) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .limit(1)
      .maybeSingle();
    wsId = membership?.workspace_id || null;
  }

  const { data: ws } = wsId
    ? await supabase
        .from('workspaces')
        .select('id, name')
        .eq('id', wsId)
        .maybeSingle()
    : { data: null as { id: string; name: string } | null };

  async function updateWorkspace(formData: FormData) {
    'use server';
    const supabase = getSupabaseServer();
    const id = String(formData.get('workspace_id') || '');
    const name = String(formData.get('name') || '').trim();
    if (!id || !name) return;
    await supabase.from('workspaces').update({ name }).eq('id', id);
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Workspace</h1>
      {ws ? (
        <form action={updateWorkspace} className="space-y-3 max-w-md">
          <input type="hidden" name="workspace_id" value={ws.id} />
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input name="name" defaultValue={ws.name || ''} className="mt-1 w-full rounded-md border px-3 py-2" />
          </div>
          <button type="submit" className="px-4 py-2 rounded-md bg-black text-white">Speichern</button>
        </form>
      ) : (
        <p className="text-gray-600">Kein Workspace gefunden.</p>
      )}
      {ws ? <InviteSection workspaceId={ws.id} /> : null}
    </main>
  );
}

async function InviteSection({ workspaceId }: { workspaceId: string }): Promise<React.ReactElement | null> {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();

  const canInvite = membership?.role === 'owner' || membership?.role === 'admin';
  if (!canInvite) return null;

  async function inviteMember(formData: FormData) {
    'use server';
    const email = String(formData.get('email') || '').trim();
    const role = String(formData.get('role') || 'member');
    const wsId = String(formData.get('workspace_id') || '');
    if (!email || !wsId) return;
    const admin = createAdmin();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${appUrl}/auth/callback` });
    if (error || !invited?.user?.id) return;
    await admin.from('users').upsert({ id: invited.user.id, email });
    await admin.from('workspace_members').upsert({ workspace_id: wsId, user_id: invited.user.id, role });
  }

  function createAdmin() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }

  return (
    <section className="mt-8 max-w-md">
      <h2 className="font-semibold mb-2">Mitglieder einladen</h2>
      <form action={inviteMember} className="space-y-3">
        <input type="hidden" name="workspace_id" value={workspaceId} />
        <div>
          <label className="block text-sm font-medium">E-Mail</label>
          <input name="email" type="email" required className="mt-1 w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Rolle</label>
          <select name="role" className="mt-1 w-full border rounded-md px-3 py-2" defaultValue="member">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50">Einladung senden</button>
      </form>
    </section>
  );
}
