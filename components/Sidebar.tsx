import Link from 'next/link';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { logout } from '@/app/auth/actions';
import { revalidatePath } from 'next/cache';

export default async function Sidebar() {
  const supabase = getSupabaseServer();
  const cookieStore = cookies();
  const activeCookie = cookieStore.get('active_ws')?.value || null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let workspaceOptions: Array<{ id: string; name: string; role: string }> = [];
  let activeWs: string | null = activeCookie;
  let activeRole: string | null = null;

  if (user) {
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id);
    const ids = (memberships || []).map((m) => m.workspace_id);
    const { data: workspaces } = ids.length
      ? await supabase.from('workspaces').select('id, name').in('id', ids)
      : { data: [] as Array<{ id: string; name: string }> };
    workspaceOptions = (workspaces || []).map((w) => {
      const mem = (memberships || []).find((m) => m.workspace_id === w.id);
      return { id: w.id, name: w.name || 'Workspace', role: mem?.role || 'member' };
    });
    if (!activeWs && workspaceOptions.length) {
      activeWs = workspaceOptions[0].id;
    }
    activeRole = workspaceOptions.find((w) => w.id === activeWs)?.role || null;
  }

  async function setActiveWorkspace(formData: FormData) {
    'use server';
    const id = String(formData.get('workspace_id') || '');
    if (!id) return;
    const store = cookies();
    store.set('active_ws', id, { path: '/' });
    revalidatePath('/');
  }

  return (
    <aside className="h-screen w-64 border-r bg-gradient-to-b from-white to-gray-50 p-6 hidden md:flex flex-col shadow-sm">
      <div className="font-bold text-xl mb-6 bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
        Client Portal
      </div>
      {workspaceOptions.length ? (
        <form action={setActiveWorkspace} className="mb-6">
          <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Workspace</label>
          <select name="workspace_id" defaultValue={activeWs || undefined} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all">
            {workspaceOptions.map((w) => (
              <option key={w.id} value={w.id}>{w.name} {w.role !== 'owner' ? `(${w.role})` : ''}</option>
            ))}
          </select>
        </form>
      ) : null}
      <nav className="space-y-1 flex-1">
        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50 transition-all font-medium text-gray-700 hover:text-primary-700 group">
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </Link>
        <Link href="/pricing" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50 transition-all font-medium text-gray-700 hover:text-primary-700 group">
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Pricing
        </Link>
        {activeRole === 'owner' || activeRole === 'admin' ? (
          <Link href="/settings/billing" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50 transition-all font-medium text-gray-700 hover:text-primary-700 group">
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Billing
          </Link>
        ) : null}
        <Link href="/settings/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50 transition-all font-medium text-gray-700 hover:text-primary-700 group">
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profil
        </Link>
        <Link href="/settings/workspace" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50 transition-all font-medium text-gray-700 hover:text-primary-700 group">
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Workspace
        </Link>
      </nav>
      <div className="border-t pt-4 mt-4">
        <form action={logout}>
          <button type="submit" className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-red-50 transition-all font-medium text-gray-700 hover:text-red-600 group">
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
