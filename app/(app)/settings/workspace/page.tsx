import { requireUser } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureWorkspaceSubscription, getEntitlementSummary } from '@/lib/billing/subscriptions';
import { logAuditEvent } from '@/lib/audit';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

type WorkspaceRole = 'owner' | 'admin' | 'member';

type WorkspaceMember = {
  id: string;
  role: WorkspaceRole;
  created_at: string;
  user: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
};

type AuditLogEntry = {
  id: string;
  action: string;
  actor: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
  target: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const ROLE_OPTIONS: WorkspaceRole[] = ['owner', 'admin', 'member'];

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Mitglied',
};

function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return typeof value === 'string' && ROLE_OPTIONS.includes(value as WorkspaceRole);
}

function displayName(person: AuditLogEntry['actor']) {
  if (!person) return 'Unbekannt';
  if (person.full_name) return person.full_name;
  if (person.email) return person.email;
  return 'Unbekannt';
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function describeAuditEntry(entry: AuditLogEntry) {
  const actor = displayName(entry.actor);
  const target = displayName(entry.target);
  switch (entry.action) {
    case 'member.invited':
      return `${actor} hat ${target} eingeladen`;
    case 'member.role_updated': {
      const from = entry.metadata && typeof entry.metadata === 'object' ? (entry.metadata as Record<string, unknown>).from : undefined;
      const to = entry.metadata && typeof entry.metadata === 'object' ? (entry.metadata as Record<string, unknown>).to : undefined;
      if (isWorkspaceRole(from) && isWorkspaceRole(to)) {
        return `${actor} hat die Rolle von ${target} von ${ROLE_LABELS[from]} zu ${ROLE_LABELS[to]} geändert`;
      }
      return `${actor} hat die Rolle von ${target} geändert`;
    }
    case 'member.removed':
      return `${actor} hat ${target} aus dem Workspace entfernt`;
    default:
      return `${actor} hat eine Aktion ausgeführt`;
  }
}

async function recordAuditLog(params: {
  workspaceId: string;
  action: string;
  actorId: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  resourceType?: string | null;
  resourceId?: string | null;
  summary?: string | null;
}) {
  const admin = getSupabaseAdmin();
  await logAuditEvent(
    {
      workspaceId: params.workspaceId,
      action: params.action,
      actorId: params.actorId,
      targetId: params.targetId ?? null,
      metadata: params.metadata ?? {},
      resourceType: params.resourceType ?? 'workspace_member',
      resourceId: params.resourceId ?? params.targetId ?? null,
      summary: params.summary ?? null,
    },
    admin
  );
}

export default async function WorkspaceSettingsPage() {
  const user = await requireUser();
  const supabase = getSupabaseServer();
  const cookieStore = cookies();
  const activeCookie = cookieStore.get('active_ws')?.value || null;

  let workspaceId = activeCookie as string | null;
  if (!workspaceId) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    workspaceId = membership?.workspace_id || null;
  }

  if (!workspaceId) {
    return <NoWorkspaceState />;
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('id', workspaceId)
    .maybeSingle();

  if (!workspace) {
    return <NoWorkspaceState />;
  }

  const { data: membersData } = await supabase
    .from('workspace_members')
    .select('id, role, created_at, user:users(id, email, full_name)')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: true }) as unknown as { data: WorkspaceMember[] | null };

  const members: WorkspaceMember[] = membersData ?? [];

  const currentMember = members.find((m) => m.user?.id === user.id);
  const currentRole = currentMember?.role;
  const canManageMembers = currentRole === 'owner' || currentRole === 'admin';
  const canManageWorkspace = currentRole === 'owner' || currentRole === 'admin';

  const { data: auditLogData } = await supabase
    .from('workspace_audit_logs')
    .select('id, action, actor:users!workspace_audit_logs_actor_id_fkey(id, email, full_name), target:users!workspace_audit_logs_target_id_fkey(id, email, full_name), metadata, created_at')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })
    .limit(25) as unknown as { data: AuditLogEntry[] | null };

  const auditLogs: AuditLogEntry[] = auditLogData ?? [];

  async function updateWorkspace(formData: FormData) {
    'use server';
    const supabase = getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const id = String(formData.get('workspace_id') || '');
    const name = String(formData.get('name') || '').trim();
    if (!id || !name) return;

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return;
    }

    await supabase.from('workspaces').update({ name }).eq('id', id);
    revalidatePath('/settings/workspace');
  }

  async function updateMemberRoleAction(formData: FormData) {
    'use server';
    const supabase = getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const memberId = String(formData.get('member_id') || '');
    const role = String(formData.get('role') || '').toLowerCase();
    if (!memberId || !isWorkspaceRole(role)) return;

    const { data: target } = await supabase
      .from('workspace_members')
      .select('id, workspace_id, user_id, role')
      .eq('id', memberId)
      .maybeSingle();
    if (!target) return;

    const { data: actorMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', target.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!actorMembership) return;

    const actorRole = actorMembership.role as WorkspaceRole;
    if (actorRole !== 'owner' && actorRole !== 'admin') return;

    const desiredRole = role;

    if (desiredRole === 'owner' && actorRole !== 'owner') {
      return;
    }

    if (target.role === 'owner' && actorRole !== 'owner') {
      return;
    }

    if (target.role === 'owner' && desiredRole !== 'owner') {
      const { data: otherOwners } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', target.workspace_id)
        .eq('role', 'owner')
        .neq('id', target.id);
      if (!otherOwners || otherOwners.length === 0) {
        return;
      }
    }

    const { error } = await supabase
      .from('workspace_members')
      .update({ role: desiredRole })
      .eq('id', memberId);
    if (error) return;

    await recordAuditLog({
      workspaceId: target.workspace_id,
      action: 'member.role_updated',
      actorId: user.id,
      targetId: target.user_id,
      metadata: { from: target.role, to: desiredRole },
    });
    revalidatePath('/settings/workspace');
  }

  async function removeMemberAction(formData: FormData) {
    'use server';
    const supabase = getSupabaseServer();
    const cookieStore = cookies();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const memberId = String(formData.get('member_id') || '');
    if (!memberId) return;

    const { data: target } = await supabase
      .from('workspace_members')
      .select('id, workspace_id, user_id, role')
      .eq('id', memberId)
      .maybeSingle();
    if (!target) return;

    const { data: actorMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', target.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!actorMembership) return;

    const actorRole = actorMembership.role as WorkspaceRole;
    if (actorRole !== 'owner' && actorRole !== 'admin') return;

    if (target.role === 'owner' && actorRole !== 'owner') {
      return;
    }

    if (target.role === 'owner') {
      const { data: otherOwners } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', target.workspace_id)
        .eq('role', 'owner')
        .neq('id', target.id);
      if (!otherOwners || otherOwners.length === 0) {
        return;
      }
    }

    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId);
    if (error) return;

    await recordAuditLog({
      workspaceId: target.workspace_id,
      action: 'member.removed',
      actorId: user.id,
      targetId: target.user_id,
    });

    if (target.user_id === user.id) {
      const { data: nextMembership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (nextMembership?.workspace_id) {
        cookieStore.set('active_ws', nextMembership.workspace_id, { path: '/' });
      } else {
        cookieStore.delete('active_ws');
      }
    }

    revalidatePath('/settings/workspace');
    revalidatePath('/');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Header />
        <section className="card-gradient p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Workspace-Einstellungen
          </h2>
          <form action={updateWorkspace} className="space-y-4">
            <input type="hidden" name="workspace_id" value={workspace.id} />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Workspace-Name</label>
              <input
                name="name"
                defaultValue={workspace.name || ''}
                placeholder="Mein Workspace"
                className="input-field"
                disabled={!canManageWorkspace}
              />
              <p className="text-xs text-gray-500 mt-1">Der Name deines Workspaces, sichtbar für alle Mitglieder</p>
            </div>
            <button type="submit" className="btn-primary" disabled={!canManageWorkspace}>
              Änderungen speichern
            </button>
          </form>
        </section>

        <WorkspaceMembersSection
          members={members}
          currentUserId={user.id}
          currentRole={currentRole ?? 'member'}
          canManageMembers={canManageMembers}
          updateMemberRoleAction={updateMemberRoleAction}
          removeMemberAction={removeMemberAction}
        />

        {canManageMembers ? (
          <InviteSection workspaceId={workspace.id} actorRole={currentRole ?? 'member'} />
        ) : null}

        <AuditLogSection entries={auditLogs} />

        <CreateWorkspaceSection />
      </div>
    </main>
  );
}

function Header() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-primary-900 bg-clip-text text-transparent">
        Workspace
      </h1>
      <p className="text-gray-600 mt-2">Verwalte deinen Workspace, Mitglieder und Zugänge</p>
    </div>
  );
}

function WorkspaceMembersSection({
  members,
  currentUserId,
  currentRole,
  canManageMembers,
  updateMemberRoleAction,
  removeMemberAction,
}: {
  members: WorkspaceMember[];
  currentUserId: string;
  currentRole: WorkspaceRole;
  canManageMembers: boolean;
  updateMemberRoleAction: (formData: FormData) => Promise<void>;
  removeMemberAction: (formData: FormData) => Promise<void>;
}) {
  if (!members.length) {
    return null;
  }

  return (
    <section className="card-gradient p-8">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Team-Mitglieder
      </h2>
      <div className="overflow-hidden border border-gray-200 rounded-xl bg-white">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Mitglied</th>
              <th className="px-4 py-3">Rolle</th>
              <th className="px-4 py-3 w-32 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {members.map((member) => {
              const isCurrentUser = member.user?.id === currentUserId;
              const canEditRole = canManageMembers && (!isCurrentUser || currentRole === 'owner');
              const canRemove = canManageMembers && (!isCurrentUser || currentRole === 'owner');
              const name = member.user?.full_name || member.user?.email || 'Unbekanntes Mitglied';

              return (
                <tr key={member.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{name}</div>
                    <div className="text-xs text-gray-500">{member.user?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {canEditRole ? (
                      <form action={updateMemberRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="member_id" value={member.id} />
                        <select
                          name="role"
                          defaultValue={member.role}
                          className="input-field py-1 h-9"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role} disabled={role === 'owner' && currentRole !== 'owner'}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="btn-tertiary h-9 px-3">
                          Speichern
                        </button>
                      </form>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {ROLE_LABELS[member.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canRemove ? (
                      <form action={removeMemberAction} className="flex justify-end">
                        <input type="hidden" name="member_id" value={member.id} />
                        <button
                          type="submit"
                          className="btn-danger text-xs"
                          disabled={member.role === 'owner' && currentRole !== 'owner'}
                        >
                          Entfernen
                        </button>
                      </form>
                    ) : (
                      <div className="text-right text-xs text-gray-400">Keine Aktion</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function InviteSection({ workspaceId, actorRole }: { workspaceId: string; actorRole: WorkspaceRole }) {
  async function inviteMember(formData: FormData) {
    'use server';
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const role = String(formData.get('role') || 'member');
    const wsId = String(formData.get('workspace_id') || '');
    if (!email || !wsId) return;

    const supabase = getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', wsId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return;
    }

    const entitlementSummary = await getEntitlementSummary(wsId, admin);
    if (entitlementSummary.entitlements.maxTeamMembers !== null) {
      const { count: memberCount } = await admin
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', wsId);
      if ((memberCount || 0) >= entitlementSummary.entitlements.maxTeamMembers) {
        redirect('/pricing?limit=team');
      }
    }

    let desiredRole: WorkspaceRole = isWorkspaceRole(role) ? role : 'member';
    if (membership.role !== 'owner' && desiredRole === 'owner') {
      desiredRole = 'admin';
    }

    const admin = getSupabaseAdmin();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    let targetUserId: string | null = null;

    const existingUser = await admin.auth.admin.getUserByEmail(email).catch(() => null);
    if (existingUser?.data.user) {
      targetUserId = existingUser.data.user.id;
    }

    if (!targetUserId) {
      const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${appUrl}/auth/callback`,
      });
      if (error || !invited?.user?.id) {
        return;
      }
      targetUserId = invited.user.id;
    }

    if (!targetUserId) return;

    await admin.from('users').upsert({ id: targetUserId, email });
    await admin
      .from('workspace_members')
      .upsert({ workspace_id: wsId, user_id: targetUserId, role: desiredRole }, { onConflict: 'workspace_id, user_id' });

    await recordAuditLog({
      workspaceId: wsId,
      action: 'member.invited',
      actorId: user.id,
      targetId: targetUserId,
      metadata: { role: desiredRole },
    });

    revalidatePath('/settings/workspace');
  }

  return (
    <section className="card-gradient p-8">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
        Mitglieder einladen
      </h2>
      <form action={inviteMember} className="space-y-4">
        <input type="hidden" name="workspace_id" value={workspaceId} />
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">E-Mail-Adresse</label>
          <input
            name="email"
            type="email"
            required
            placeholder="kollege@beispiel.de"
            className="input-field"
          />
          <p className="text-xs text-gray-500 mt-1">Eine Einladungs-E-Mail wird an diese Adresse gesendet</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Rolle</label>
          <select name="role" className="input-field" defaultValue={actorRole === 'owner' ? 'owner' : 'member'}>
            <option value="member">Mitglied - Zugriff auf Projekte</option>
            <option value="admin">Admin - Kann Mitglieder verwalten</option>
            <option value="owner" disabled={actorRole !== 'owner'}>Owner - Vollzugriff</option>
          </select>
        </div>
        <button type="submit" className="btn-secondary w-full">
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
            Einladung senden
          </span>
        </button>
      </form>
    </section>
  );
}

function AuditLogSection({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <section className="card-gradient p-8">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M15 12h.01M9 16h6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Audit-Log
      </h2>
      {entries.length === 0 ? (
        <div className="text-sm text-gray-500">Noch keine Aktivitäten erfasst.</div>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary-500 mt-2" />
              <div>
                <div className="text-sm text-gray-800">{describeAuditEntry(entry)}</div>
                <div className="text-xs text-gray-500">{formatDateTime(entry.created_at)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function NoWorkspaceState() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Header />
        <div className="card-gradient p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-gray-700">Kein Workspace gefunden.</p>
          <p className="text-gray-500 mt-2">Leg jetzt einen Workspace an, um loszulegen.</p>
        </div>
        <CreateWorkspaceSection />
      </div>
    </main>
  );
}

async function CreateWorkspaceSection() {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  async function createWorkspace(formData: FormData) {
    'use server';
    const supabase = getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const name = String(formData.get('name') || '').trim();
    const fallbackName = user.email ? `${user.email}'s Workspace` : 'Neuer Workspace';

    try {
      const admin = getSupabaseAdmin();
      const { data: ws } = await admin
        .from('workspaces')
        .insert({ name: name || fallbackName, created_by: user.id })
        .select('id')
        .single();

      if (ws?.id) {
        await admin
          .from('workspace_members')
          .insert({ workspace_id: ws.id, user_id: user.id, role: 'owner' });
        await ensureWorkspaceSubscription(ws.id, { client: admin });
        const store = cookies();
        store.set('active_ws', ws.id, { path: '/' });
        redirect('/settings/workspace');
      }
    } catch (_) {
      const { data: ws } = await supabase
        .from('workspaces')
        .insert({ name: name || fallbackName, created_by: user.id })
        .select('id')
        .single();

      if (ws?.id) {
        await supabase
          .from('workspace_members')
          .insert({ workspace_id: ws.id, user_id: user.id, role: 'owner' });
        try {
          await ensureWorkspaceSubscription(ws.id);
        } catch (subscriptionError) {
          console.warn('[workspace] Failed to ensure subscription for new workspace', subscriptionError);
        }
        const store = cookies();
        store.set('active_ws', ws.id, { path: '/' });
        redirect('/settings/workspace');
      }
    }
  }

  return (
    <section className="card-gradient p-8">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Neuen Workspace erstellen
      </h2>
      <form action={createWorkspace} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Workspace-Name</label>
          <input name="name" placeholder="z.B. Agentur Müller" className="input-field" />
          <p className="text-xs text-gray-500 mt-1">Wird automatisch als aktiv gesetzt</p>
        </div>
        <button type="submit" className="btn-secondary">
          Workspace anlegen
        </button>
      </form>
    </section>
  );
}
