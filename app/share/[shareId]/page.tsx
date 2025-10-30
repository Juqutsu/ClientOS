import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const revalidate = 60;

export default async function PublicSharePage({ params }: { params: { shareId: string } }) {
  const admin = getSupabaseAdmin();
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
    <main>
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="font-bold text-lg bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">Client Portal</a>
          <nav className="text-sm flex items-center gap-4">
            <a href="/" className="text-gray-700 hover:text-primary-700">Startseite</a>
            <a href="/auth/login" className="text-gray-700 hover:text-primary-700">Login</a>
          </nav>
        </div>
      </header>
      <div className="max-w-3xl mx-auto p-6 space-y-8">
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
      </div>
    </main>
  );
}
