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
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-primary-900 bg-clip-text text-transparent flex items-center gap-3">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Dateien
          </h1>
          <p className="text-gray-600 mt-2">Verwalte und teile Dateien für dieses Projekt</p>
        </div>

        <div className="card-gradient p-8">
          <FileUpload projectId={params.id} />
        </div>

        {(files || []).length > 0 ? (
          <div className="card-gradient p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Hochgeladene Dateien
            </h2>
            <ul className="space-y-3">
              {(files || []).map((f) => (
                <li key={f.id} className="bg-gradient-to-r from-white to-gray-50 border-2 border-gray-200 rounded-xl px-5 py-4 hover:shadow-md hover:border-primary-300 transition-all">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <a href={f.file_url || '#'} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 font-medium hover:underline break-all flex items-center gap-2 group">
                          {f.file_name}
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(f.created_at).toLocaleString('de-DE')}
                        </div>
                      </div>
                    </div>
                    <form action={deleteFile}>
                      <input type="hidden" name="file_id" value={f.id} />
                      <input type="hidden" name="file_url" value={f.file_url || ''} />
                      <button type="submit" className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Datei löschen">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="card-gradient p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Noch keine Dateien</h3>
            <p className="text-gray-600">Lade deine erste Datei hoch!</p>
          </div>
        )}
      </div>
    </main>
  );
}
