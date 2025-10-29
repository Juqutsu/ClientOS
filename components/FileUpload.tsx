"use client";

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';

export default function FileUpload({ projectId }: { projectId: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setError(null);
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      const supabase = getSupabaseBrowser();
      const path = `${projectId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('project-files').upload(path, file);
      if (uploadError) throw uploadError;
      await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ file_name: file.name, path }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
    } finally {
      setUploading(false);
      e.currentTarget.value = '';
    }
  }

  return (
    <div>
      <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer bg-white hover:bg-gray-50">
        <input type="file" className="hidden" onChange={onChange} disabled={uploading} />
        {uploading ? 'Hochladen…' : 'Datei hochladen'}
      </label>
      {error ? <p className="text-sm text-red-600 mt-2">{error}</p> : null}
    </div>
  );
}
