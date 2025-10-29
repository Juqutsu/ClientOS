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

  async function deleteFile(formData: FormData) {
    'use server';
    const supabase = getSupabaseServer();
    const fileId = String(formData.get('file_id') || '');
    const fileUrl = String(formData.get('file_url') || '');
    if (!fileId || !fileUrl) return;
    // Extract storage path (after /project-files/)
    const marker = '/project-files/';
    const idx = fileUrl.indexOf(marker);
    if (idx !== -1) {
      const path = decodeURIComponent(fileUrl.slice(idx + marker.length));
      await supabase.storage.from('project-files').remove([path]);
    }
    await supabase.from('files').delete().eq('id', fileId);
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dateien</h1>
        <FileUpload projectId={params.id} />
      </div>

      <ul className="space-y-2">
        {(files || []).map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 border rounded-md px-3 py-2">
            <div className="min-w-0 flex-1">
              <a href={f.file_url || '#'} target="_blank" className="text-blue-600 hover:underline break-all">
                {f.file_name}
              </a>
              <div className="text-xs text-gray-500">{new Date(f.created_at).toLocaleString()}</div>
            </div>
            <form action={deleteFile}>
              <input type="hidden" name="file_id" value={f.id} />
              <input type="hidden" name="file_url" value={f.file_url || ''} />
              <button type="submit" className="text-red-600 text-sm hover:underline">Löschen</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
