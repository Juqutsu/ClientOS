"use client";

import { useCallback, useRef, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';

type UploadingItem = { name: string; progress: number; error?: string };

export default function FileUpload({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<UploadingItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const supabase = getSupabaseBrowser();
    const list = Array.from(files);
    for (const file of list) {
      // Basic validation
      const maxSize = 25 * 1024 * 1024; // 25 MB
      if (file.size > maxSize) {
        setItems((prev) => [...prev, { name: file.name, progress: 0, error: 'Datei zu groß' }]);
        continue;
      }
      setItems((prev) => [...prev, { name: file.name, progress: 0 }]);
      const path = `${projectId}/${Date.now()}_${file.name}`;
      // Note: Supabase JS does not expose per-chunk progress for uploads currently
      // so we optimistically set to 100% after upload returns
      const { error: uploadError } = await supabase.storage.from('project-files').upload(path, file);
      if (uploadError) {
        setItems((prev) => prev.map((it) => (it.name === file.name ? { ...it, error: uploadError.message } : it)));
        continue;
      }
      setItems((prev) => prev.map((it) => (it.name === file.name ? { ...it, progress: 100 } : it)));
      await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ file_name: file.name, path }),
      });
    }
  }, [projectId]);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length) {
      await uploadFiles(files);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-md cursor-pointer bg-white hover:bg-gray-50 w-full ${dragOver ? 'ring-2 ring-blue-400' : ''}`}
      >
        <input ref={inputRef} type="file" className="hidden" onChange={onChange} multiple />
        <span>Dateien hochladen oder hierher ziehen</span>
      </label>
      {items.length ? (
        <ul className="mt-3 space-y-2">
          {items.map((it) => (
            <li key={`${it.name}-${Math.random()}`} className="flex items-center justify-between text-sm">
              <span className="truncate max-w-[60%]">{it.name}</span>
              {it.error ? (
                <span className="text-red-600">{it.error}</span>
              ) : (
                <span className="text-gray-500">{it.progress}%</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
