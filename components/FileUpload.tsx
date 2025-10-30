"use client";

import { useCallback, useMemo, useRef, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import type { FileRecord } from '@/components/files/types';

type UploadingItem = { id: string; name: string; progress: number; error?: string; success?: boolean };

type Props = {
  projectId: string;
  existingFolders?: string[];
  onUploaded?: (file: FileRecord) => void;
};

const DEFAULT_MAX_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50');
const MAX_FILE_SIZE_BYTES = DEFAULT_MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
];
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'docx', 'xlsx', 'txt', 'zip'];

export default function FileUpload({ projectId, existingFolders = [], onUploaded }: Props) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [items, setItems] = useState<UploadingItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [folder, setFolder] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const parseTags = useCallback(() => {
    return tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0 && tag.length <= 40);
  }, [tagsInput]);

  const validateFileType = (file: File) => {
    if (!file.type) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext ? ALLOWED_EXTENSIONS.includes(ext) : false;
    }
    if (ALLOWED_MIME_TYPES.includes(file.type)) return true;
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ext ? ALLOWED_EXTENSIONS.includes(ext) : false;
  };

  const sanitizeFolder = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.includes('..')) throw new Error('Ungültiger Ordnername.');
    if (!/^[\w\-\/\s]{1,120}$/.test(trimmed)) {
      throw new Error("Ordnernamen dürfen nur Buchstaben, Zahlen, Leerzeichen, '-' und '/' enthalten.");
    }
    return trimmed.replace(/\s{2,}/g, ' ');
  };

  const registerItem = (name: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setItems((prev) => [...prev, { id, name, progress: 0 }]);
    return id;
  };

  const reportError = (id: string, message: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, error: message, progress: 0 } : item)));
  };

  const markSuccess = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, progress: 100, success: true } : item)));
  };

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      for (const file of list) {
        const itemId = registerItem(file.name);

        if (file.size > MAX_FILE_SIZE_BYTES) {
          reportError(itemId, `Datei zu groß (max. ${DEFAULT_MAX_SIZE_MB}MB)`);
          continue;
        }

        if (!validateFileType(file)) {
          reportError(itemId, 'Nicht unterstützter Dateityp');
          continue;
        }

        const safeFolder = (() => {
          try {
            return sanitizeFolder(folder);
          } catch (error) {
            if (error instanceof Error) {
              reportError(itemId, error.message);
              return undefined;
            }
            throw error;
          }
        })();

        if (safeFolder === undefined) {
          continue;
        }

        const storagePath = `${projectId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(storagePath, file, { contentType: file.type || undefined });
        if (uploadError) {
          reportError(itemId, uploadError.message);
          continue;
        }

        const body = {
          file_name: file.name,
          path: storagePath,
          mime_type: file.type || null,
          file_size: file.size,
          folder: safeFolder,
          tags: parseTags(),
        };

        const response = await fetch(`/api/projects/${projectId}/files`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          reportError(itemId, errorText || 'Serverfehler beim Speichern');
          continue;
        }

        const payload = (await response.json()) as { file: FileRecord };
        markSuccess(itemId);
        onUploaded?.(payload.file);
      }
    },
    [folder, onUploaded, parseTags, projectId, supabase]
  );

  const onChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    const { files } = event.dataTransfer;
    if (files && files.length) {
      await uploadFiles(files);
    }
  };

  const acceptAttribute = 'image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/zip';

  return (
    <div className="w-full max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ordner</label>
          <input
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            placeholder="z. B. Angebote/2025"
            className="input-field"
            list="existing-folders"
          />
          {existingFolders.length ? (
            <datalist id="existing-folders">
              {existingFolders.map((entry) => (
                <option key={entry} value={entry} />
              ))}
            </datalist>
          ) : null}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (Kommagetrennt)</label>
          <input
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder="z. B. Angebot, Freigabe"
            className="input-field"
          />
        </div>
      </div>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          dragOver
            ? 'border-primary-500 bg-primary-50 scale-105'
            : 'border-gray-300 bg-gradient-to-br from-white to-gray-50 hover:border-primary-400 hover:bg-primary-50/50'
        }`}
      >
        <input ref={inputRef} type="file" className="hidden" onChange={onChange} multiple accept={acceptAttribute} />
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="text-center">
          <span className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            Dateien hochladen
          </span>
          <p className="text-sm text-gray-600 mt-1">
            Unterstützte Formate: Bilder, PDF, DOCX, XLSX, ZIP, TXT (max. {DEFAULT_MAX_SIZE_MB}MB)
          </p>
        </div>
      </label>

      {items.length ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Upload-Status</h3>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="card-gradient p-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.error ? 'bg-red-100' : item.success ? 'bg-green-100' : 'bg-blue-100'
                    }`}
                  >
                    {item.error ? (
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : item.success ? (
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                  </div>
                  <span className="truncate font-medium text-gray-700">{item.name}</span>
                </div>
                {item.error ? (
                  <span className="text-red-600 text-xs font-semibold ml-2">{item.error}</span>
                ) : (
                  <span className={`text-xs font-semibold ml-2 ${item.success ? 'text-green-600' : 'text-blue-600'}`}>
                    {item.success ? 'Erfolgreich' : `${item.progress}%`}
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
