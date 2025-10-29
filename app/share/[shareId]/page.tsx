import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function PublicSharePage({ params }: { params: { shareId: string } }) {
  const admin = getAdmin();
  const { data: project } = await admin
    .from('projects')
    .select('id, name, description, client_name')
    .eq('share_id', params.shareId)
    .maybeSingle();

  if (!project) {
    return (
      <main className="p-6">
        <p className="text-gray-600">Projekt nicht gefunden.</p>
      </main>
    );
  }

  const [{ data: tasks }, { data: files }] = await Promise.all([
    admin
      .from('tasks')
      .select('id, title, status')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false }),
    admin
      .from('files')
      .select('id, file_name, file_url, created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        {project.client_name ? (
          <p className="text-gray-600">Kunde: {project.client_name}</p>
        ) : null}
        {project.description ? (
          <p className="text-gray-600 mt-2">{project.description}</p>
        ) : null}
      </header>

      <section>
        <h2 className="font-semibold mb-2">Aufgaben</h2>
        <ul className="space-y-2">
          {(tasks || []).map((t) => (
            <li key={t.id} className="border rounded-md px-3 py-2">
              <span className={t.status === 'done' ? 'line-through text-gray-400' : ''}>{t.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Dateien</h2>
        <ul className="space-y-2">
          {(files || []).map((f) => (
            <li key={f.id} className="flex items-center justify-between border rounded-md px-3 py-2">
              <a href={f.file_url || '#'} target="_blank" className="text-blue-600 hover:underline">
                {f.file_name}
              </a>
              <span className="text-xs text-gray-500">{new Date(f.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
