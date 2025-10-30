import { requireUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
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

  const cookieStore = cookies();
  const activeCookie = cookieStore.get('active_ws')?.value || null;

  // Find workspace(s) for this user
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id);

  const workspaceId = activeCookie || (memberships && memberships[0]?.workspace_id) || null;

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
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-primary-900 bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-gray-600 mt-2 text-lg">Hier siehst du deine Projekte und kannst neue erstellen.</p>
        </div>

        <form action={createProject} className="card-gradient p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neues Projekt erstellen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Projektname</label>
              <input name="name" placeholder="z.B. Website Redesign" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kundenname</label>
              <input name="client_name" placeholder="z.B. Musterfirma GmbH" className="input-field" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <input name="description" placeholder="Kurze Beschreibung des Projekts" className="input-field" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn-primary w-full">
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Projekt erstellen
                </span>
              </button>
            </div>
          </div>
        </form>

        {(projects || []).length > 0 ? (
          <>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Deine Projekte
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(projects || []).map((p: ProjectRow) => (
                <ProjectCard key={p.id} name={p.name} clientName={p.client_name} description={p.description} href={`/projects/${p.id}`} />
              ))}
            </div>
          </>
        ) : (
          <div className="card-gradient p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Noch keine Projekte</h3>
            <p className="text-gray-600">Erstelle dein erstes Projekt mit dem Formular oben!</p>
          </div>
        )}
      </div>
    </main>
  );
}
