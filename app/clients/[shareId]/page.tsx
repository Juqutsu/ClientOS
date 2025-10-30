import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const revalidate = 60;

export default async function ClientSharePage({ params }: { params: { shareId: string } }) {
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
      .select('id, title, status, description, notes, due_date, created_at, updated_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false }),
    admin
      .from('files')
      .select('id, file_name, file_url, preview_url, folder, tags, mime_type, file_size, scan_status, created_at')
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
        <ul className="space-y-3">
          {(tasks || []).map((task) => {
            const dueLabel = task.due_date
              ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(task.due_date))
              : 'Kein Fälligkeitsdatum';
            return (
              <li key={task.id} className="border rounded-lg px-4 py-3 bg-white/60">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {task.title}
                    </span>
                    <span className="text-xs text-gray-500">{dueLabel}</span>
                  </div>
                  {task.description ? <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p> : null}
                  {task.notes ? (
                    <div className="text-xs text-gray-500 bg-gray-100 rounded-md px-3 py-2">
                      Notiz: {task.notes}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Dateien</h2>
        <ul className="space-y-3">
          {(files || []).map((file) => (
            <li key={file.id} className="border rounded-lg px-4 py-3 bg-white/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <a href={file.file_url || '#'} target="_blank" className="text-blue-600 hover:underline break-all">
                    {file.file_name}
                  </a>
                  <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-2">
                    <span>{new Date(file.created_at).toLocaleString('de-DE')}</span>
                    {file.folder ? <span className="px-2 py-1 bg-gray-100 rounded-full">Ordner: {file.folder}</span> : null}
                    {file.tags?.length ? (
                      <span>
                        Tags:{' '}
                        {file.tags.map((tag) => `#${tag}`).join(', ')}
                      </span>
                    ) : null}
                  </div>
                </div>
                {file.preview_url && file.mime_type?.startsWith('image/') ? (
                  <img src={file.preview_url} alt={file.file_name} className="w-16 h-16 object-cover rounded-md border" />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
      </div>
    </main>
  );
}
