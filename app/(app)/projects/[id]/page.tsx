import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import ShareLink from '@/components/ShareLink';

export default async function ProjectPage({ params }: { params: { id: string } }) {
  await requireUser();
  const supabase = getSupabaseServer();
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, client_name, share_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!project) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="card-gradient p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-gray-700">Projekt nicht gefunden.</p>
          </div>
        </div>
      </main>
    );
  }

  async function ensureShareId(formData: FormData) {
    'use server';
    const supabase = getSupabaseServer();
    const id = String(formData.get('project_id') || '');
    if (!id) return;
    const newId = Math.random().toString(36).slice(2, 10);
    await supabase.from('projects').update({ share_id: newId }).eq('id', id);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="card-gradient p-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-primary-900 bg-clip-text text-transparent">{project.name}</h1>
              {project.client_name ? (
                <div className="flex items-center gap-2 mt-2 text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {project.client_name}
                </div>
              ) : null}
              {project.description ? (
                <p className="text-gray-600 mt-3 max-w-2xl leading-relaxed">{project.description}</p>
              ) : null}
            </div>
          </div>
        </div>

      {/* Edit project */}
      <ProjectEditor projectId={project.id} name={project.name} description={project.description} clientName={project.client_name} />

        <div className="card-gradient p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Projekt teilen
          </h2>
          {project.share_id ? (
            <ShareLink shareId={project.share_id} />
          ) : (
            <form action={ensureShareId}>
              <input type="hidden" name="project_id" value={project.id} />
              <button type="submit" className="btn-outline">Share-Link erzeugen</button>
            </form>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href={`/projects/${project.id}/tasks`} className="card-gradient p-6 group hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">Aufgaben</h3>
                <p className="text-sm text-gray-600">Verwalte deine Tasks</p>
              </div>
            </div>
          </Link>
          <Link href={`/projects/${project.id}/files`} className="card-gradient p-6 group hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">Dateien</h3>
                <p className="text-sm text-gray-600">Hochladen & Teilen</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}

async function updateProject(formData: FormData) {
  'use server';
  const supabase = getSupabaseServer();
  const id = String(formData.get('project_id') || '');
  const name = String(formData.get('name') || '');
  const description = String(formData.get('description') || '');
  const clientName = String(formData.get('client_name') || '');
  if (!id) return;
  await supabase.from('projects').update({ name, description, client_name: clientName }).eq('id', id);
}

async function deleteProject(formData: FormData) {
  'use server';
  const supabase = getSupabaseServer();
  const id = String(formData.get('project_id') || '');
  if (!id) return;
  await supabase.from('projects').delete().eq('id', id);
}

function ProjectEditor({ projectId, name, description, clientName }: { projectId: string; name: string | null; description: string | null; clientName: string | null }) {
  return (
    <div className="card-gradient p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Projekt bearbeiten
      </h2>
      <form action={updateProject} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="hidden" name="project_id" value={projectId} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Projektname</label>
          <input name="name" defaultValue={name ?? ''} placeholder="Projektname" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kundenname</label>
          <input name="client_name" defaultValue={clientName ?? ''} placeholder="Kunde" className="input-field" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
          <input name="description" defaultValue={description ?? ''} placeholder="Beschreibung" className="input-field" />
        </div>
        <div className="md:col-span-2 flex items-center gap-3">
          <button type="submit" className="btn-primary">Änderungen speichern</button>
        </div>
      </form>
      <div className="border-t mt-6 pt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Gefahrenzone</h3>
        <form action={deleteProject}>
          <input type="hidden" name="project_id" value={projectId} />
          <button type="submit" className="px-4 py-2 rounded-lg border-2 border-red-500 text-red-600 hover:bg-red-50 transition-all font-medium">
            Projekt löschen
          </button>
        </form>
      </div>
    </div>
  );
}
