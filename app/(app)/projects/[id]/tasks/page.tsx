import { requireUser } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function ProjectTasksPage({ params }: { params: { id: string } }) {
  await requireUser();
  const supabase = getSupabaseServer();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false });

  async function addTask(formData: FormData) {
    'use server';
    const supabase = getSupabaseServer();
    const title = String(formData.get('title') || '').trim();
    const projectId = String(formData.get('project_id') || '');
    if (!title || !projectId) return;
    await supabase.from('tasks').insert({ project_id: projectId, title });
  }

  async function cycleTask(formData: FormData) {
    'use server';
    const supabase = getSupabaseServer();
    const taskId = String(formData.get('task_id') || '');
    const current = String(formData.get('current_status') || 'todo');
    if (!taskId) return;
    const next = current === 'todo' ? 'in_progress' : current === 'in_progress' ? 'done' : 'todo';
    await supabase.from('tasks').update({ status: next }).eq('id', taskId);
  }

  async function deleteTask(formData: FormData) {
    'use server';
    const supabase = getSupabaseServer();
    const taskId = String(formData.get('task_id') || '');
    if (!taskId) return;
    await supabase.from('tasks').delete().eq('id', taskId);
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Aufgaben</h1>

      <form action={addTask} className="flex items-center gap-2">
        <input type="hidden" name="project_id" value={params.id} />
        <input name="title" placeholder="Neue Aufgabe" className="border rounded-md px-3 py-2 w-full max-w-md" />
        <button type="submit" className="px-3 py-2 border rounded-md bg-white hover:bg-gray-50">Hinzufügen</button>
      </form>

      {/* Aufgabenliste mit Statuswechsel und Löschen */}
      <div className="mt-4 space-y-2">
        {(tasks || []).map((t) => {
          const label = t.status === 'todo' ? 'Offen' : t.status === 'in_progress' ? 'In Arbeit' : 'Erledigt';
          return (
            <div key={t.id} className="flex items-center justify-between border rounded-md px-3 py-2">
              <div className="flex items-center gap-3 min-w-0">
                <form action={cycleTask} className="flex items-center gap-2 shrink-0">
                  <input type="hidden" name="task_id" value={t.id} />
                  <input type="hidden" name="current_status" value={t.status || 'todo'} />
                  <button type="submit" title="Status wechseln" className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-gray-50">
                    {label}
                  </button>
                </form>
                <span className={`truncate ${t.status === 'done' ? 'line-through text-gray-400' : ''}`}>{t.title}</span>
              </div>
              <form action={deleteTask}>
                <input type="hidden" name="task_id" value={t.id} />
                <button type="submit" className="text-red-600 text-sm hover:underline">Löschen</button>
              </form>
            </div>
          );
        })}
      </div>
    </main>
  );
}
