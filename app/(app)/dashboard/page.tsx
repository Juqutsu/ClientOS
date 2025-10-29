import { requireUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import ProjectCard from '@/components/ProjectCard';

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  share_id: string | null;
};

function generateShareId() {
  return Math.random().toString(36).slice(2, 10);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = getSupabaseServer();

  // Find first workspace for this user
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  const workspaceId = membership?.workspace_id || null;

  const { data: projects } = workspaceId
    ? await supabase
        .from('projects')
        .select('id, name, description, client_name, share_id')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
    : { data: [] as ProjectRow[] };

  async function createProject(formData: FormData) {
    'use server';
    const supabase = getSupabaseServer();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    const name = String(formData.get('name') || 'Neues Projekt');
    const description = String(formData.get('description') || '');
    const clientName = String(formData.get('client_name') || '');

    // Find workspace
    const { data: mem } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userRes.user.id)
      .limit(1)
      .maybeSingle();
    const wsId = mem?.workspace_id;
    if (!wsId) return;

    // Enforce Free plan limit: max 3 Projekte ohne aktive Subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('workspace_id', wsId)
      .maybeSingle();
    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', wsId);
    const isActive = sub?.status === 'active';
    const maxFree = 3;
    if (!isActive && (count || 0) >= maxFree) {
      // Redirect to pricing if limit reached
      redirect('/pricing?limit=1');
    }

    await supabase.from('projects').insert({
      workspace_id: wsId,
      name,
      description,
      client_name: clientName,
      share_id: generateShareId(),
    });
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-gray-600 mt-2">Hier siehst du deine Projekte.</p>

      <form action={createProject} className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input name="name" placeholder="Projektname" className="border rounded-md px-3 py-2" />
        <input name="client_name" placeholder="Kundenname" className="border rounded-md px-3 py-2" />
        <input name="description" placeholder="Beschreibung" className="border rounded-md px-3 py-2 md:col-span-2" />
        <button type="submit" className="md:col-span-4 bg-black text-white rounded-md py-2">Projekt erstellen</button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {(projects || []).map((p: ProjectRow) => (
          <ProjectCard key={p.id} name={p.name} clientName={p.client_name} description={p.description} href={`/projects/${p.id}`} />
        ))}
      </div>
    </main>
  );
}
