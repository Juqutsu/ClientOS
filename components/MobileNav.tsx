import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import MobileNavClient from './MobileNavClient';
import { getSupabaseServer } from '@/lib/supabase/server';

type WorkspaceOption = {
  id: string;
  name: string;
  role: string;
};

export default async function MobileNav() {
  const supabase = getSupabaseServer();
  const cookieStore = cookies();
  const activeCookie = cookieStore.get('active_ws')?.value || null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let workspaces: WorkspaceOption[] = [];
  let activeWorkspaceId = activeCookie as string | null;
  let activeRole: string | null = null;

  if (user) {
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id);

    const workspaceIds = (memberships || []).map((membership) => membership.workspace_id);

    const { data: workspaceRows } = workspaceIds.length
      ? await supabase
          .from('workspaces')
          .select('id, name')
          .in('id', workspaceIds)
      : { data: [] as { id: string; name: string | null }[] };

    workspaces = (workspaceRows || []).map((workspaceRow) => {
      const membership = (memberships || []).find((item) => item.workspace_id === workspaceRow.id);
      return {
        id: workspaceRow.id,
        name: workspaceRow.name || 'Workspace',
        role: membership?.role || 'member',
      };
    });

    if (!activeWorkspaceId && workspaces.length) {
      activeWorkspaceId = workspaces[0].id;
    }

    activeRole = workspaces.find((entry) => entry.id === activeWorkspaceId)?.role || null;
  }

  async function switchWorkspace(formData: FormData) {
    'use server';
    const id = String(formData.get('workspace_id') || '');
    if (!id) return;
    const store = cookies();
    store.set('active_ws', id, { path: '/' });
    revalidatePath('/');
  }

  return (
    <MobileNavClient
      workspaces={workspaces}
      activeWorkspaceId={activeWorkspaceId}
      activeRole={activeRole}
      switchWorkspaceAction={switchWorkspace}
    />
  );
}
