import TaskManager from '@/components/tasks/TaskManager';
import { requireUser } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function ProjectTasksPage({ params }: { params: { id: string } }) {
  await requireUser();
  const supabase = getSupabaseServer();

  const [{ data: initialTasks }, { count }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, project_id, title, status, description, notes, due_date, created_at, updated_at')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', params.id),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-primary-900 bg-clip-text text-transparent flex items-center gap-3">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Aufgaben
          </h1>
          <p className="text-gray-600 mt-2 max-w-2xl">
            Plane und verfolge Aufgaben für dieses Projekt, inklusive Beschreibungen, Notizen und Fälligkeiten.
          </p>
        </div>

        <TaskManager
          projectId={params.id}
          initialTasks={initialTasks || []}
          initialTotal={typeof count === 'number' ? count : initialTasks?.length || 0}
        />
      </div>
    </main>
  );
}
