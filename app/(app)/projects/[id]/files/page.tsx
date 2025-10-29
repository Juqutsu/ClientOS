import { requireUser } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import FileUpload from '@/components/FileUpload';

export default async function ProjectFilesPage({ params }: { params: { id: string } }) {
  await requireUser();
  const supabase = getSupabaseServer();

  const { data: files } = await supabase
    .from('files')
    .select('id, file_name, file_url, created_at')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false });

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dateien</h1>
        <FileUpload projectId={params.id} />
      </div>

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
    </main>
  );
}
