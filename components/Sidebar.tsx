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
    <aside className="h-screen w-64 border-r bg-white p-4 hidden md:flex flex-col">
      <div className="font-bold text-lg mb-4">Client Portal</div>
      {workspaceOptions.length ? (
        <form action={setActiveWorkspace} className="mb-4">
          <label className="block text-xs text-gray-500 mb-1">Workspace</label>
          <select name="workspace_id" defaultValue={activeWs || undefined} className="w-full border rounded-md px-2 py-1">
            {workspaceOptions.map((w) => (
              <option key={w.id} value={w.id}>{w.name} {w.role !== 'owner' ? `(${w.role})` : ''}</option>
            ))}
          </select>
        </form>
      ) : null}
      <nav className="space-y-2 flex-1">
        <Link href="/dashboard" className="block px-2 py-1 rounded hover:bg-gray-100">Dashboard</Link>
        <Link href="/pricing" className="block px-2 py-1 rounded hover:bg-gray-100">Pricing</Link>
        {activeRole === 'owner' || activeRole === 'admin' ? (
          <Link href="/settings/billing" className="block px-2 py-1 rounded hover:bg-gray-100">Billing</Link>
        ) : null}
        <Link href="/settings/profile" className="block px-2 py-1 rounded hover:bg-gray-100">Profil</Link>
        <Link href="/settings/workspace" className="block px-2 py-1 rounded hover:bg-gray-100">Workspace</Link>
      </nav>
      <form action={logout} className="pt-4">
        <button type="submit" className="w-full text-left px-2 py-1 rounded hover:bg-gray-100">Logout</button>
      </form>
    </aside>
  );
}
