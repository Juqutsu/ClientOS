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

  async function toggleTask(formData: FormData) {
    'use server';
    const supabase = getSupabaseServer();
    const taskId = String(formData.get('task_id') || '');
    const status = String(formData.get('status') || 'todo');
    if (!taskId) return;
    await supabase.from('tasks').update({ status }).eq('id', taskId);
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Aufgaben</h1>

      <form action={addTask} className="flex items-center gap-2">
        <input type="hidden" name="project_id" value={params.id} />
        <input name="title" placeholder="Neue Aufgabe" className="border rounded-md px-3 py-2 w-full max-w-md" />
        <button type="submit" className="px-3 py-2 border rounded-md bg-white hover:bg-gray-50">Hinzufügen</button>
      </form>

      {/* Simple server action form per task for toggling */}
      <div className="mt-4 space-y-2">
        {(tasks || []).map((t) => (
          <form key={t.id} action={toggleTask} className="flex items-center gap-2 border rounded-md px-3 py-2">
            <input type="hidden" name="task_id" value={t.id} />
            <input type="hidden" name="status" value={t.status === 'done' ? 'todo' : 'done'} />
            <button className="h-4 w-4 border rounded-sm flex items-center justify-center bg-white">
              {t.status === 'done' ? '✓' : ''}
            </button>
            <span className={t.status === 'done' ? 'line-through text-gray-400' : ''}>{t.title}</span>
          </form>
        ))}
      </div>
    </main>
  );
}
