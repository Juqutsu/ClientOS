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
    <div className="w-full max-w-2xl">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          dragOver 
            ? 'border-primary-500 bg-primary-50 scale-105' 
            : 'border-gray-300 bg-gradient-to-br from-white to-gray-50 hover:border-primary-400 hover:bg-primary-50/50'
        }`}
      >
        <input ref={inputRef} type="file" className="hidden" onChange={onChange} multiple />
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="text-center">
          <span className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            Dateien hochladen
          </span>
          <p className="text-sm text-gray-600 mt-1">oder hierher ziehen (max. 25MB)</p>
        </div>
      </label>
      {items.length ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Hochgeladene Dateien</h3>
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={`${it.name}-${Math.random()}`} className="card-gradient p-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    it.error ? 'bg-red-100' : it.progress === 100 ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {it.error ? (
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    ) : it.progress === 100 ? (
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                  </div>
                  <span className="truncate font-medium text-gray-700">{it.name}</span>
                </div>
                {it.error ? (
                  <span className="text-red-600 text-xs font-semibold ml-2">{it.error}</span>
                ) : (
                  <span className={`text-xs font-semibold ml-2 ${
                    it.progress === 100 ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {it.progress}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
