import FileManager from '@/components/files/FileManager';
import { requireUser } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function ProjectFilesPage({ params }: { params: { id: string } }) {
  await requireUser();
  const supabase = getSupabaseServer();

  const [{ data: initialFiles }, { count }] = await Promise.all([
    supabase
      .from('files')
      .select('id, project_id, file_name, file_url, preview_url, folder, tags, mime_type, file_size, scan_status, created_at, updated_at')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('files')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', params.id),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-primary-900 bg-clip-text text-transparent flex items-center gap-3">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Dateien
          </h1>
          <p className="text-gray-600 mt-2 max-w-2xl">
            Verwalte Uploads pro Projekt, ordne sie in Ordnern, versehe sie mit Tags und behalte Virenscan-Status im Blick.
          </p>
        </div>

        <FileManager
          projectId={params.id}
          initialFiles={initialFiles || []}
          initialTotal={typeof count === 'number' ? count : initialFiles?.length || 0}
        />
      </div>
    </main>
  );
}
