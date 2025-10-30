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
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-primary-900 bg-clip-text text-transparent flex items-center gap-3">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Aufgaben
          </h1>
          <p className="text-gray-600 mt-2">Verwalte die Aufgaben für dieses Projekt</p>
        </div>

        <div className="card-gradient p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neue Aufgabe erstellen
          </h2>
          <form action={addTask} className="flex items-center gap-3">
            <input type="hidden" name="project_id" value={params.id} />
            <input name="title" placeholder="z.B. Design erstellen..." className="input-field flex-1" />
            <button type="submit" className="btn-primary whitespace-nowrap">
              Hinzufügen
            </button>
          </form>
        </div>

        {(tasks || []).length > 0 ? (
          <div className="card-gradient p-6">
            <h2 className="text-lg font-bold mb-4">Aufgabenliste</h2>
            <div className="space-y-3">
              {(tasks || []).map((t) => {
                const statusConfig = {
                  todo: { label: 'Offen', bg: 'bg-gray-100', text: 'text-gray-700', gradient: 'from-gray-50 to-gray-100', border: 'border-gray-300' },
                  in_progress: { label: 'In Arbeit', bg: 'bg-blue-100', text: 'text-blue-700', gradient: 'from-blue-50 to-blue-100', border: 'border-blue-300' },
                  done: { label: 'Erledigt', bg: 'bg-green-100', text: 'text-green-700', gradient: 'from-green-50 to-green-100', border: 'border-green-300' },
                };
                const config = statusConfig[t.status as keyof typeof statusConfig] || statusConfig.todo;
                
                return (
                  <div key={t.id} className={`bg-gradient-to-r ${config.gradient} border-2 ${config.border} rounded-xl px-5 py-4 transition-all hover:shadow-md`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <form action={cycleTask}>
                          <input type="hidden" name="task_id" value={t.id} />
                          <input type="hidden" name="current_status" value={t.status || 'todo'} />
                          <button type="submit" title="Status wechseln" className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${config.bg} ${config.text} hover:scale-105 transition-transform`}>
                            {config.label}
                          </button>
                        </form>
                        <span className={`font-medium flex-1 ${t.status === 'done' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                          {t.title}
                        </span>
                        {t.status === 'done' && (
                          <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <form action={deleteTask}>
                        <input type="hidden" name="task_id" value={t.id} />
                        <button type="submit" className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Löschen">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card-gradient p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Noch keine Aufgaben</h3>
            <p className="text-gray-600">Erstelle deine erste Aufgabe oben!</p>
          </div>
        )}
      </div>
    </main>
  );
}
