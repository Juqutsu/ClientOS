"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

type TaskStatus = 'todo' | 'in_progress' | 'done';

type TaskRecord = {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  description: string | null;
  notes: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string | null;
};

type Filters = {
  status: 'all' | TaskStatus;
  due: 'all' | 'overdue' | 'today' | 'soon' | 'no_due';
  sort: 'created_desc' | 'due_asc' | 'due_desc' | 'updated_desc';
  search: string;
};

const DEFAULT_FILTERS: Filters = {
  status: 'all',
  due: 'all',
  sort: 'created_desc',
  search: '',
};

type Props = {
  projectId: string;
  initialTasks: TaskRecord[];
  initialTotal: number;
};

export default function TaskManager({ projectId, initialTasks, initialTotal }: Props) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks);
  const [total, setTotal] = useState(initialTotal);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialTasks.length < initialTotal);
  const [creating, setCreating] = useState(false);
  const [creatingAdvanced, setCreatingAdvanced] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    notes: '',
    due_date: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ [key: string]: string | null }>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const fetchTasks = useCallback(
    async ({ targetPage, append }: { targetPage: number; append: boolean }) => {
      setLoading(!append);
      setLoadingMore(append);
      try {
        const from = targetPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const soon = new Date(today);
        soon.setDate(today.getDate() + 7);
        const soonStr = soon.toISOString().slice(0, 10);

        let query = supabase
          .from('tasks')
          .select(
            'id, project_id, title, status, description, notes, due_date, created_at, updated_at',
            { count: 'exact' }
          )
          .eq('project_id', projectId);

        if (filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }

        if (filters.search.trim()) {
          const trimmed = filters.search.trim();
          const sanitized = trimmed.replace(/[%_]/g, '\\$&').replace(/,/g, '\\,');
          query = query.or(
            `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%,notes.ilike.%${sanitized}%`
          );
        }

        if (filters.due === 'overdue') {
          query = query.not('due_date', 'is', null).lt('due_date', todayStr);
        } else if (filters.due === 'today') {
          query = query.eq('due_date', todayStr);
        } else if (filters.due === 'soon') {
          query = query
            .not('due_date', 'is', null)
            .gte('due_date', todayStr)
            .lte('due_date', soonStr);
        } else if (filters.due === 'no_due') {
          query = query.is('due_date', null);
        }

        const orderClauses: Array<{ column: keyof TaskRecord; ascending: boolean; nullsFirst?: boolean }> = [];
        switch (filters.sort) {
          case 'due_asc':
            orderClauses.push({ column: 'due_date', ascending: true, nullsFirst: false });
            orderClauses.push({ column: 'created_at', ascending: false });
            break;
          case 'due_desc':
            orderClauses.push({ column: 'due_date', ascending: false, nullsFirst: true });
            orderClauses.push({ column: 'created_at', ascending: false });
            break;
          case 'updated_desc':
            orderClauses.push({ column: 'updated_at', ascending: false });
            orderClauses.push({ column: 'created_at', ascending: false });
            break;
          default:
            orderClauses.push({ column: 'created_at', ascending: false });
            break;
        }

        orderClauses.forEach(({ column, ascending, nullsFirst }) => {
          query = query.order(column as string, { ascending, nullsFirst });
        });

        const { data, error, count } = await query.range(from, to);
        if (error) throw error;

        setPage(targetPage);
        setTotal((prev) => (typeof count === 'number' ? count : prev));

        setTasks((prev) => {
          const combined = append ? [...prev, ...(data || [])] : [...(data || [])];
          const unique: TaskRecord[] = [];
          const seen = new Set<string>();
          combined.forEach((item) => {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              unique.push(item as TaskRecord);
            }
          });
          return unique;
        });

        const effectiveCount = typeof count === 'number' ? count : total;
        const loaded = from + (data?.length || 0);
        setHasMore(loaded < effectiveCount);
      } catch (error) {
        console.error(error);
        toast.error('Aufgaben konnten nicht geladen werden.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters, projectId, supabase, total]
  );

  const ensureInitialised = useCallback(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return false;
    }
    return true;
  }, []);

  const handleFiltersSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFilters((prev) => ({ ...prev, search: searchDraft.trim() }));
    },
    [searchDraft]
  );

  const handleStatusFilterChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as Filters['status'];
    setFilters((prev) => ({ ...prev, status: value }));
  }, []);

  const handleDueFilterChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as Filters['due'];
    setFilters((prev) => ({ ...prev, due: value }));
  }, []);

  const handleSortChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as Filters['sort'];
    setFilters((prev) => ({ ...prev, sort: value }));
  }, []);

  const handleSearchDraftChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchDraft(event.target.value);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchDraft('');
  }, []);

  const loadFreshTasks = useCallback(() => {
    const shouldFetch = ensureInitialised();
    setPage(0);
    if (shouldFetch) {
      fetchTasks({ targetPage: 0, append: false });
    }
  }, [ensureInitialised, fetchTasks]);

  useEffect(() => {
    loadFreshTasks();
  }, [filters, loadFreshTasks]);

  const cycleStatus = (current: TaskStatus): TaskStatus => {
    if (current === 'todo') return 'in_progress';
    if (current === 'in_progress') return 'done';
    return 'todo';
  };

  const handleCreateTask = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const title = createForm.title.trim();
      if (!title) {
        toast.error('Bitte einen Titel angeben.');
        return;
      }
      setCreating(true);
      try {
        const payload = {
          project_id: projectId,
          title,
          description: createForm.description.trim() || null,
          notes: createForm.notes.trim() || null,
          due_date: createForm.due_date ? createForm.due_date : null,
          status: 'todo' as TaskStatus,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('tasks')
          .insert(payload)
          .select('id, project_id, title, status, description, notes, due_date, created_at, updated_at')
          .single();
        if (error) throw error;
        setTasks((prev) => [data as TaskRecord, ...prev]);
        setTotal((prev) => prev + 1);
        setHasMore((prev) => prev || tasks.length + 1 < total + 1);
        setCreateForm({ title: '', description: '', notes: '', due_date: '' });
        toast.success('Aufgabe erstellt.');
      } catch (error) {
        console.error(error);
        toast.error('Aufgabe konnte nicht erstellt werden.');
      } finally {
        setCreating(false);
      }
    },
    [createForm, projectId, supabase, tasks.length, total]
  );

  const beginEdit = useCallback((task: TaskRecord) => {
    setEditingId(task.id);
    setEditDraft({
      title: task.title,
      description: task.description ?? '',
      notes: task.notes ?? '',
      due_date: task.due_date ?? '',
      status: task.status,
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDraft({});
  }, []);

  const handleEditFieldChange = useCallback((field: string, value: string) => {
    setEditDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveTask = useCallback(async () => {
    if (!editingId) return;
    const title = (editDraft.title ?? '').trim();
    if (!title) {
      toast.error('Titel darf nicht leer sein.');
      return;
    }
    setSavingId(editingId);
    try {
      const payload = {
        title,
        description: (editDraft.description ?? '').trim() || null,
        notes: (editDraft.notes ?? '').trim() || null,
        due_date: editDraft.due_date ? (editDraft.due_date as string) : null,
        status: (editDraft.status as TaskStatus) || 'todo',
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', editingId)
        .select('id, project_id, title, status, description, notes, due_date, created_at, updated_at')
        .single();
      if (error) throw error;
      setTasks((prev) => prev.map((task) => (task.id === editingId ? (data as TaskRecord) : task)));
      toast.success('Aufgabe aktualisiert.');
      cancelEdit();
    } catch (error) {
      console.error(error);
      toast.error('Aufgabe konnte nicht aktualisiert werden.');
    } finally {
      setSavingId(null);
    }
  }, [cancelEdit, editDraft, editingId, supabase]);

  const handleToggleStatus = useCallback(
    async (task: TaskRecord) => {
      const nextStatus = cycleStatus(task.status);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
      try {
        const { data, error } = await supabase
          .from('tasks')
          .update({ status: nextStatus, updated_at: new Date().toISOString() })
          .eq('id', task.id)
          .select('id, project_id, title, status, description, notes, due_date, created_at, updated_at')
          .single();
        if (error) throw error;
        setTasks((prev) => prev.map((t) => (t.id === task.id ? (data as TaskRecord) : t)));
      } catch (error) {
        console.error(error);
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
        toast.error('Status konnte nicht aktualisiert werden.');
      }
    },
    [supabase]
  );

  const handleDeleteTask = useCallback(
    async (task: TaskRecord) => {
      if (!confirm('Soll diese Aufgabe wirklich gelöscht werden?')) return;
      setDeletingId(task.id);
      const previousTasks = tasks;
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setTotal((prev) => Math.max(prev - 1, 0));
      try {
        const { error } = await supabase.from('tasks').delete().eq('id', task.id);
        if (error) throw error;
        toast.success('Aufgabe gelöscht.');
      } catch (error) {
        console.error(error);
        setTasks(previousTasks);
        setTotal((prev) => prev + 1);
        toast.error('Aufgabe konnte nicht gelöscht werden.');
      } finally {
        setDeletingId(null);
      }
    },
    [supabase, tasks]
  );

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    fetchTasks({ targetPage: nextPage, append: true });
  }, [fetchTasks, hasMore, loading, loadingMore, page]);

  const formatDueDate = (value: string | null) => {
    if (!value) return 'Kein Fälligkeitsdatum';
    try {
      return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(value));
    } catch (error) {
      console.error(error);
      return value;
    }
  };

  return (
    <div className="space-y-6">
      <section className="card-gradient p-6 space-y-4">
        <form onSubmit={handleFiltersSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
              Suche
            </label>
            <div className="flex gap-2">
              <input
                value={searchDraft}
                onChange={handleSearchDraftChange}
                placeholder="Titel, Beschreibung oder Notizen suchen"
                className="input-field flex-1"
              />
              <button type="submit" className="btn-secondary whitespace-nowrap">
                Suchen
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
              Status
            </label>
            <select value={filters.status} onChange={handleStatusFilterChange} className="input-field">
              <option value="all">Alle</option>
              <option value="todo">Offen</option>
              <option value="in_progress">In Arbeit</option>
              <option value="done">Erledigt</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
              Fälligkeit
            </label>
            <select value={filters.due} onChange={handleDueFilterChange} className="input-field">
              <option value="all">Alle</option>
              <option value="overdue">Überfällig</option>
              <option value="today">Heute</option>
              <option value="soon">In den nächsten 7 Tagen</option>
              <option value="no_due">Ohne Fälligkeit</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
              Sortierung
            </label>
            <select value={filters.sort} onChange={handleSortChange} className="input-field">
              <option value="created_desc">Neueste zuerst</option>
              <option value="due_asc">Fälligkeitsdatum (aufsteigend)</option>
              <option value="due_desc">Fälligkeitsdatum (absteigend)</option>
              <option value="updated_desc">Zuletzt aktualisiert</option>
            </select>
          </div>
          <div className="md:col-span-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-500">
              {tasks.length} von {total} Aufgaben geladen
            </div>
            <button type="button" onClick={handleResetFilters} className="btn-tertiary">
              Filter zurücksetzen
            </button>
          </div>
        </form>
      </section>

      <section className="card-gradient p-6 space-y-4">
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800">Neue Aufgabe erstellen</h2>
          <button
            type="button"
            onClick={() => setCreatingAdvanced((prev) => !prev)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {creatingAdvanced ? 'Einfache Ansicht' : 'Weitere Felder'}
          </button>
        </header>
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <input
                value={createForm.title}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="z. B. Kick-off vorbereiten"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fälligkeitsdatum</label>
              <input
                type="date"
                value={createForm.due_date}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, due_date: event.target.value }))}
                className="input-field"
              />
            </div>
          </div>
          {creatingAdvanced ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <textarea
                  value={createForm.description}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  className="input-field"
                  placeholder="Kurze Beschreibung der Aufgabe"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                <textarea
                  value={createForm.notes}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={2}
                  className="input-field"
                  placeholder="Optionale interne Notizen"
                />
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Speichert...' : 'Aufgabe hinzufügen'}
            </button>
            <button
              type="button"
              className="btn-tertiary"
              onClick={() => setCreateForm({ title: '', description: '', notes: '', due_date: '' })}
            >
              Zurücksetzen
            </button>
          </div>
        </form>
      </section>

      <section className="card-gradient p-6">
        <header className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Aufgabenliste</h2>
          {loading ? (
            <span className="text-sm text-gray-500">Lädt...</span>
          ) : null}
        </header>
        {tasks.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-12">
            Keine Aufgaben gefunden. Passe die Filter an oder lege oben eine neue Aufgabe an.
          </div>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => {
              const isEditing = editingId === task.id;
              const dueLabel = formatDueDate(task.due_date);
              const statusBadge =
                task.status === 'done'
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : task.status === 'in_progress'
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200';
              return (
                <li
                  key={task.id}
                  className="border-2 border-gray-200 rounded-xl bg-gradient-to-r from-white to-gray-50 px-5 py-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(task)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${statusBadge}`}
                        >
                          {task.status === 'todo'
                            ? 'Offen'
                            : task.status === 'in_progress'
                            ? 'In Arbeit'
                            : 'Erledigt'}
                        </button>
                        <span
                          className={`font-medium text-lg ${
                            task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {dueLabel}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                            <input
                              value={editDraft.title ?? ''}
                              onChange={(event) => handleEditFieldChange('title', event.target.value)}
                              className="input-field"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fälligkeit</label>
                            <input
                              type="date"
                              value={editDraft.due_date ?? ''}
                              onChange={(event) => handleEditFieldChange('due_date', event.target.value)}
                              className="input-field"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                              value={(editDraft.status as TaskStatus) ?? task.status}
                              onChange={(event) => handleEditFieldChange('status', event.target.value)}
                              className="input-field"
                            >
                              <option value="todo">Offen</option>
                              <option value="in_progress">In Arbeit</option>
                              <option value="done">Erledigt</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                            <textarea
                              value={editDraft.description ?? ''}
                              onChange={(event) => handleEditFieldChange('description', event.target.value)}
                              rows={3}
                              className="input-field"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                            <textarea
                              value={editDraft.notes ?? ''}
                              onChange={(event) => handleEditFieldChange('notes', event.target.value)}
                              rows={2}
                              className="input-field"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleSaveTask}
                            className="btn-primary"
                            disabled={savingId === task.id}
                          >
                            {savingId === task.id ? 'Speichert...' : 'Speichern'}
                          </button>
                          <button type="button" onClick={cancelEdit} className="btn-tertiary">
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {task.description ? (
                          <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
                        ) : null}
                        {task.notes ? (
                          <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
                            <span className="font-semibold text-gray-700">Notiz:</span> {task.notes}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>
                            Erstellt am{' '}
                            {new Intl.DateTimeFormat('de-DE', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }).format(new Date(task.created_at))}
                          </span>
                          {task.updated_at ? (
                            <span>
                              Aktualisiert am{' '}
                              {new Intl.DateTimeFormat('de-DE', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }).format(new Date(task.updated_at))}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => beginEdit(task)} className="btn-tertiary text-sm">
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task)}
                            className="btn-danger text-sm"
                            disabled={deletingId === task.id}
                          >
                            {deletingId === task.id ? 'Löscht...' : 'Löschen'}
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
            <button
              type="button"
              onClick={handleLoadMore}
              className="btn-secondary"
              disabled={loadingMore}
            >
              {loadingMore ? 'Lädt...' : 'Mehr laden'}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
