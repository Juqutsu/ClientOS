import { requireUser } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
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
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-primary-900 bg-clip-text text-transparent">Workspace</h1>
          <p className="text-gray-600 mt-2">Verwalte deine Workspace-Einstellungen und Mitglieder</p>
        </div>

        {ws ? (
          <div className="card-gradient p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Workspace-Einstellungen
            </h2>
            <form action={updateWorkspace} className="space-y-4">
              <input type="hidden" name="workspace_id" value={ws.id} />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Workspace-Name</label>
                <input name="name" defaultValue={ws.name || ''} placeholder="Mein Workspace" className="input-field" />
                <p className="text-xs text-gray-500 mt-1">Der Name deines Workspaces, sichtbar für alle Mitglieder</p>
              </div>
              <button type="submit" className="btn-primary">Änderungen speichern</button>
            </form>
          </div>
        ) : (
          <div className="card-gradient p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-gray-700">Kein Workspace gefunden.</p>
          </div>
        )}
        {ws ? <InviteSection workspaceId={ws.id} /> : null}
        <CreateWorkspaceSection />
      </div>
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
    return getSupabaseAdmin();
  }

  return (
    <div className="card-gradient p-8">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
        Mitglieder einladen
      </h2>
      <form action={inviteMember} className="space-y-4">
        <input type="hidden" name="workspace_id" value={workspaceId} />
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">E-Mail-Adresse</label>
          <input 
            name="email" 
            type="email" 
            required 
            placeholder="kollege@beispiel.de" 
            className="input-field" 
          />
          <p className="text-xs text-gray-500 mt-1">Eine Einladungs-E-Mail wird an diese Adresse gesendet</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Rolle</label>
          <select name="role" className="input-field" defaultValue="member">
            <option value="member">Member - Kann Projekte ansehen und bearbeiten</option>
            <option value="admin">Admin - Kann Mitglieder verwalten</option>
          </select>
        </div>
        <button type="submit" className="btn-secondary w-full">
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
            Einladung senden
          </span>
        </button>
      </form>
    </div>
  );
}

async function CreateWorkspaceSection(): Promise<React.ReactElement | null> {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  async function createWorkspace(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '').trim();
    const supabase = getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const fallbackName = user.email ? `${user.email}'s Workspace` : 'Neuer Workspace';
    try {
      const admin = getSupabaseAdmin();
      const { data: ws } = await admin
        .from('workspaces')
        .insert({ name: name || fallbackName, created_by: user.id })
        .select('id')
        .single();
      if (ws?.id) {
        await admin
          .from('workspace_members')
          .insert({ workspace_id: ws.id, user_id: user.id, role: 'owner' });
        const store = cookies();
        store.set('active_ws', ws.id, { path: '/' });
        redirect('/settings/workspace');
      }
    } catch (_) {
      // Fallback: use RLS-enabled inserts via authenticated client
      const { data: ws } = await supabase
        .from('workspaces')
        .insert({ name: name || fallbackName, created_by: user.id })
        .select('id')
        .single();
      if (ws?.id) {
        await supabase
          .from('workspace_members')
          .insert({ workspace_id: ws.id, user_id: user.id, role: 'owner' });
        const store = cookies();
        store.set('active_ws', ws.id, { path: '/' });
        redirect('/settings/workspace');
      }
    }
  }

  return (
    <div className="card-gradient p-8">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Neuen Workspace erstellen
      </h2>
      <form action={createWorkspace} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Workspace-Name</label>
          <input name="name" placeholder="z.B. Agentur Müller" className="input-field" />
          <p className="text-xs text-gray-500 mt-1">Wird automatisch als aktiv gesetzt</p>
        </div>
        <button type="submit" className="btn-secondary">Workspace anlegen</button>
      </form>
    </div>
  );
}
