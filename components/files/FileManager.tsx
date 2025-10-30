"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import FileUpload from '@/components/FileUpload';
import type { FileRecord } from './types';
import type { Entitlements } from '@/lib/billing/entitlements';

const PAGE_SIZE = 20;

type ScanStatus = 'pending' | 'scanning' | 'clean' | 'flagged' | 'failed';

type FileFilters = {
  search: string;
  folder: 'all' | string;
  tag: 'all' | string;
  scan: 'all' | ScanStatus;
  sort: 'newest' | 'oldest' | 'name_asc' | 'name_desc';
};

const DEFAULT_FILTERS: FileFilters = {
  search: '',
  folder: 'all',
  tag: 'all',
  scan: 'all',
  sort: 'newest',
};

type Props = {
  projectId: string;
  initialFiles: FileRecord[];
  initialTotal: number;
  entitlements?: Entitlements;
};

export default function FileManager({ projectId, initialFiles, initialTotal, entitlements }: Props) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [files, setFiles] = useState<FileRecord[]>(initialFiles);
  const [total, setTotal] = useState(initialTotal);
  const [filters, setFilters] = useState<FileFilters>(DEFAULT_FILTERS);
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialFiles.length < initialTotal);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ folder: string; tags: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [folders, setFolders] = useState<string[]>(() => uniqueSorted(initialFiles.map((f) => f.folder).filter(Boolean) as string[]));
  const [availableTags, setAvailableTags] = useState<string[]>(() => uniqueSorted(initialFiles.flatMap((f) => f.tags ?? [])));
  const initialisedRef = useRef(false);

  useEffect(() => {
    setFolders(uniqueSorted(files.map((f) => f.folder).filter(Boolean) as string[]));
    setAvailableTags(uniqueSorted(files.flatMap((f) => f.tags ?? [])));
  }, [files]);

  const fetchFiles = useCallback(
    async ({ targetPage, append }: { targetPage: number; append: boolean }) => {
      setLoading(!append);
      setLoadingMore(append);
      try {
        const from = targetPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from('files')
          .select(
            'id, project_id, file_name, file_url, preview_url, folder, tags, mime_type, file_size, scan_status, created_at, updated_at',
            { count: 'exact' }
          )
          .eq('project_id', projectId);

        if (filters.folder !== 'all') {
          query = query.eq('folder', filters.folder);
        }

        if (filters.tag !== 'all') {
          query = query.contains('tags', [filters.tag]);
        }

        if (filters.scan !== 'all') {
          query = query.eq('scan_status', filters.scan);
        }

        if (filters.search.trim()) {
          const trimmed = filters.search.trim();
          const sanitized = trimmed.replace(/[%_]/g, '\\$&').replace(/,/g, '\\,');
          query = query.or(`file_name.ilike.%${sanitized}%,folder.ilike.%${sanitized}%`);
        }

        switch (filters.sort) {
          case 'oldest':
            query = query.order('created_at', { ascending: true });
            break;
          case 'name_asc':
            query = query.order('file_name', { ascending: true, nullsFirst: false });
            break;
          case 'name_desc':
            query = query.order('file_name', { ascending: false, nullsFirst: true });
            break;
          default:
            query = query.order('created_at', { ascending: false });
            break;
        }

        const { data, error, count } = await query.range(from, to);
        if (error) throw error;

        setPage(targetPage);
        setTotal((prev) => (typeof count === 'number' ? count : prev));
        setFiles((prev) => {
          const combined = append ? [...prev, ...(data || [])] : [...(data || [])];
          const seen = new Set<string>();
          const unique: FileRecord[] = [];
          combined.forEach((item) => {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              unique.push(item as FileRecord);
            }
          });
          return unique;
        });

        const effectiveCount = typeof count === 'number' ? count : total;
        const loaded = from + (data?.length || 0);
        setHasMore(loaded < effectiveCount);
      } catch (error) {
        console.error(error);
        toast.error('Dateien konnten nicht geladen werden.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters, projectId, supabase, total]
  );

  const ensureInitialised = useCallback(() => {
    if (!initialisedRef.current) {
      initialisedRef.current = true;
      return false;
    }
    return true;
  }, []);

  const reloadFiles = useCallback(() => {
    const shouldFetch = ensureInitialised();
    setPage(0);
    if (shouldFetch) {
      fetchFiles({ targetPage: 0, append: false });
    }
  }, [ensureInitialised, fetchFiles]);

  useEffect(() => {
    reloadFiles();
  }, [filters, reloadFiles]);

  const handleSearchSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFilters((prev) => ({ ...prev, search: searchDraft.trim() }));
    },
    [searchDraft]
  );

  const handleFilterChange = useCallback(
    (field: keyof FileFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchDraft('');
  }, []);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    fetchFiles({ targetPage: nextPage, append: true });
  }, [fetchFiles, hasMore, loading, loadingMore, page]);

  const beginEdit = useCallback((file: FileRecord) => {
    setEditingId(file.id);
    setEditDraft({
      folder: file.folder ?? '',
      tags: (file.tags ?? []).join(', '),
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDraft(null);
  }, []);

  const sanitizeFolder = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.includes('..')) throw new Error('Ungültiger Ordnername.');
    if (!/^[\w\-\/\s]{1,120}$/.test(trimmed)) throw new Error('Ordnernamen nur mit Buchstaben, Zahlen, Leerzeichen, \'-\' und \'/\'.');
    return trimmed.replace(/\s{2,}/g, ' ');
  };

  const sanitizeTags = (value: string) => {
    const tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0 && tag.length <= 40);
    return Array.from(new Set(tags));
  };

  const handleSaveMetadata = useCallback(async () => {
    if (!editingId || !editDraft) return;
    setSavingId(editingId);
    try {
      let folderValue: string | null = null;
      try {
        folderValue = editDraft.folder ? sanitizeFolder(editDraft.folder) : null;
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
          setSavingId(null);
          return;
        }
        throw error;
      }
      const tagsValue = sanitizeTags(editDraft.tags);

      const { data, error } = await supabase
        .from('files')
        .update({
          folder: folderValue,
          tags: tagsValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)
        .select('id, project_id, file_name, file_url, preview_url, folder, tags, mime_type, file_size, scan_status, created_at, updated_at')
        .single();
      if (error) throw error;
      setFiles((prev) => prev.map((file) => (file.id === editingId ? (data as FileRecord) : file)));
      toast.success('Datei-Eigenschaften gespeichert.');
      cancelEdit();
    } catch (error) {
      console.error(error);
      toast.error('Metadaten konnten nicht gespeichert werden.');
    } finally {
      setSavingId(null);
    }
  }, [cancelEdit, editDraft, editingId, supabase]);

  const handleDeleteFile = useCallback(
    async (file: FileRecord) => {
      if (!confirm('Datei wirklich löschen?')) return;
      setDeletingId(file.id);
      const previous = files;
      setFiles((prev) => prev.filter((item) => item.id !== file.id));
      setTotal((prev) => Math.max(prev - 1, 0));
      try {
        const response = await fetch(`/api/projects/${projectId}/files/${file.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        toast.success('Datei gelöscht.');
      } catch (error) {
        console.error(error);
        setFiles(previous);
        setTotal((prev) => prev + 1);
        toast.error('Datei konnte nicht gelöscht werden.');
      } finally {
        setDeletingId(null);
      }
    },
    [files, projectId]
  );

  const handleUploaded = useCallback((file: FileRecord) => {
    setFiles((prev) => [file, ...prev]);
    setTotal((prev) => prev + 1);
    toast.success('Datei hochgeladen.');
  }, []);

  const formatFileSize = (size: number | null) => {
    if (!size || size <= 0) return '–';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = size;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const scanBadges: Record<ScanStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    scanning: 'bg-blue-100 text-blue-700 border-blue-200',
    clean: 'bg-green-100 text-green-700 border-green-200',
    flagged: 'bg-red-100 text-red-700 border-red-200',
    failed: 'bg-gray-200 text-gray-700 border-gray-300',
  };

  return (
    <div className="space-y-6">
      <section className="card-gradient p-6 space-y-4">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Dateien filtern</h2>
            <p className="text-sm text-gray-500">Suche nach Dateinamen, ordne nach Ordnern oder Tags und filtere nach Scan-Ergebnissen.</p>
          </div>
          <div className="text-sm text-gray-500">{files.length} von {total} Dateien geladen</div>
        </header>
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">Suche</label>
            <div className="flex gap-2">
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Dateiname oder Ordner"
                className="input-field flex-1"
              />
              <button type="submit" className="btn-secondary whitespace-nowrap">Suchen</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">Ordner</label>
            <select
              value={filters.folder}
              onChange={(event) => handleFilterChange('folder', event.target.value)}
              className="input-field"
            >
              <option value="all">Alle</option>
              {folders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">Tag</label>
            <select
              value={filters.tag}
              onChange={(event) => handleFilterChange('tag', event.target.value)}
              className="input-field"
            >
              <option value="all">Alle</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">Scan-Status</label>
            <select
              value={filters.scan}
              onChange={(event) => handleFilterChange('scan', event.target.value)}
              className="input-field"
            >
              <option value="all">Alle</option>
              <option value="clean">Sauber</option>
              <option value="pending">Ausstehend</option>
              <option value="scanning">In Prüfung</option>
              <option value="flagged">Markiert</option>
              <option value="failed">Fehlgeschlagen</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">Sortierung</label>
            <select
              value={filters.sort}
              onChange={(event) => handleFilterChange('sort', event.target.value)}
              className="input-field"
            >
              <option value="newest">Neueste zuerst</option>
              <option value="oldest">Älteste zuerst</option>
              <option value="name_asc">Name (A–Z)</option>
              <option value="name_desc">Name (Z–A)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={handleResetFilters} className="btn-tertiary w-full">Zurücksetzen</button>
          </div>
        </form>
      </section>

      <section className="card-gradient p-6">
        <FileUpload
          projectId={projectId}
          existingFolders={folders}
          onUploaded={handleUploaded}
          maxFileSizeMb={entitlements?.maxFileSizeMb ?? undefined}
        />
        {entitlements?.maxDailyUploads !== null && entitlements?.maxDailyUploads !== undefined ? (
          <p className="mt-3 text-xs text-gray-500">
            Tageslimit: {entitlements.maxDailyUploads} Uploads pro Workspace (letzte 24 Stunden)
          </p>
        ) : null}
      </section>

      <section className="card-gradient p-6">
        <header className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Dateiliste</h2>
          {loading ? <span className="text-sm text-gray-500">Lädt...</span> : null}
        </header>

        {files.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Keine Dateien gefunden. Lade neue Dateien hoch oder passe die Filter an.
          </div>
        ) : (
          <ul className="space-y-4">
            {files.map((file) => {
              const isEditing = editingId === file.id;
              const tags = file.tags ?? [];
              const scanStatus = (file.scan_status ?? 'pending') as ScanStatus;
              const badgeClass = scanBadges[scanStatus];
              const previewSrc = file.preview_url || file.file_url;
              const isImage = file.mime_type?.startsWith('image/');
              const isPdf = file.mime_type === 'application/pdf';

              return (
                <li key={file.id} className="border-2 border-gray-200 rounded-2xl bg-gradient-to-r from-white to-gray-50 px-5 py-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-semibold text-primary-600 hover:text-primary-700 break-all"
                          >
                            {file.file_name}
                          </a>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${badgeClass}`}>
                            {scanStatusLabel(scanStatus)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>
                            Hochgeladen am{' '}
                            {new Intl.DateTimeFormat('de-DE', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }).format(new Date(file.created_at))}
                          </span>
                          <span>Größe: {formatFileSize(file.file_size)}</span>
                          {file.mime_type ? <span>Typ: {file.mime_type}</span> : null}
                        </div>
                      </div>
                      {(isImage || isPdf) ? (
                        <div className="w-full md:w-48 border border-gray-200 rounded-xl overflow-hidden bg-white">
                          {isImage ? (
                            <img src={previewSrc} alt={file.file_name} className="w-full h-32 object-cover" />
                          ) : (
                            <iframe src={`${previewSrc}#toolbar=0`} title={file.file_name} className="w-full h-32" />
                          )}
                        </div>
                      ) : null}
                    </div>

                    {isEditing && editDraft ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ordner</label>
                            <input
                              value={editDraft.folder}
                              onChange={(event) => setEditDraft((prev) => prev ? { ...prev, folder: event.target.value } : prev)}
                              className="input-field"
                              placeholder="z. B. Angebote/2025"
                              list={`folder-suggestions-${file.id}`}
                            />
                            <datalist id={`folder-suggestions-${file.id}`}>
                              {folders.map((folder) => (
                                <option key={folder} value={folder} />
                              ))}
                            </datalist>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (Kommagetrennt)</label>
                            <input
                              value={editDraft.tags}
                              onChange={(event) => setEditDraft((prev) => prev ? { ...prev, tags: event.target.value } : prev)}
                              className="input-field"
                              placeholder="z. B. Angebot, Freigabe"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={handleSaveMetadata} className="btn-primary" disabled={savingId === file.id}>
                            {savingId === file.id ? 'Speichert...' : 'Speichern'}
                          </button>
                          <button type="button" onClick={cancelEdit} className="btn-tertiary">
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          <div className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full">
                            Ordner: {file.folder ? file.folder : '—'}
                          </div>
                          {tags.length ? (
                            <div className="flex flex-wrap gap-2">
                              {tags.map((tag) => (
                                <span key={tag} className="px-3 py-1 bg-primary-50 text-primary-700 border border-primary-100 rounded-full text-xs font-semibold">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Keine Tags</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <button type="button" onClick={() => beginEdit(file)} className="btn-tertiary text-sm">
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file)}
                            className="btn-danger text-sm"
                            disabled={deletingId === file.id}
                          >
                            {deletingId === file.id ? 'Löscht...' : 'Löschen'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {hasMore ? (
          <div className="mt-6 flex justify-center">
            <button type="button" onClick={handleLoadMore} className="btn-secondary" disabled={loadingMore}>
              {loadingMore ? 'Lädt...' : 'Mehr laden'}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
}

function scanStatusLabel(status: ScanStatus): string {
  switch (status) {
    case 'clean':
      return 'Sauber';
    case 'pending':
      return 'Ausstehend';
    case 'scanning':
      return 'In Prüfung';
    case 'flagged':
      return 'Markiert';
    case 'failed':
      return 'Fehlgeschlagen';
    default:
      return status;
  }
}

