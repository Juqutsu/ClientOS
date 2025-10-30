import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

type Database = any;
type Schema = 'public';

type Client = SupabaseClient<Database, Schema, any>;

export type AuditEvent = {
  workspaceId: string;
  action: string;
  actorId: string | null;
  targetId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function logAuditEvent(event: AuditEvent, client?: Client) {
  const db = client ?? getSupabaseAdmin();
  try {
    await db.from('workspace_audit_logs').insert({
      workspace_id: event.workspaceId,
      action: event.action,
      actor_id: event.actorId,
      target_id: event.targetId ?? null,
      resource_type: event.resourceType ?? null,
      resource_id: event.resourceId ?? null,
      summary: event.summary ?? null,
      metadata: event.metadata ?? {},
    });
  } catch (error) {
    console.error('[audit] Failed to log audit event', { error, event });
  }
}
