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
      <main className="p-6">
        <p className="text-gray-600">Projekt nicht gefunden.</p>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        {project.client_name ? (
          <p className="text-gray-600">Kunde: {project.client_name}</p>
        ) : null}
        {project.description ? (
          <p className="text-gray-600 mt-2 max-w-2xl">{project.description}</p>
        ) : null}
      </div>

      {/* Edit project */}
      <ProjectEditor projectId={project.id} name={project.name} description={project.description} clientName={project.client_name} />

      <div className="space-y-2">
        <h2 className="font-semibold">Teilen</h2>
        {project.share_id ? <ShareLink shareId={project.share_id} /> : null}
      </div>

      <div className="flex items-center gap-3">
        <Link href={`/projects/${project.id}/tasks`} className="px-3 py-2 border rounded-md bg-white hover:bg-gray-50">Aufgaben</Link>
        <Link href={`/projects/${project.id}/files`} className="px-3 py-2 border rounded-md bg-white hover:bg-gray-50">Dateien</Link>
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
    <div className="border rounded-lg p-4">
      <h2 className="font-semibold mb-2">Projekt bearbeiten</h2>
      <form action={updateProject} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input type="hidden" name="project_id" value={projectId} />
        <input name="name" defaultValue={name ?? ''} placeholder="Projektname" className="border rounded-md px-3 py-2" />
        <input name="client_name" defaultValue={clientName ?? ''} placeholder="Kunde" className="border rounded-md px-3 py-2" />
        <input name="description" defaultValue={description ?? ''} placeholder="Beschreibung" className="border rounded-md px-3 py-2 md:col-span-3" />
        <button type="submit" className="px-3 py-2 rounded-md bg-black text-white md:col-span-3 w-max">Speichern</button>
      </form>
      <form action={deleteProject} className="mt-2">
        <input type="hidden" name="project_id" value={projectId} />
        <button type="submit" className="px-3 py-2 rounded-md border">Löschen</button>
      </form>
    </div>
  );
}
