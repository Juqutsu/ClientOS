import { requireUser } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function WorkspaceSettingsPage() {
  await requireUser();
  const supabase = getSupabaseServer();

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .limit(1)
    .maybeSingle();

  const wsId = membership?.workspace_id;

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
    </main>
  );
}
