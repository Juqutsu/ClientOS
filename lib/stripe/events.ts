import type Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

type EventStatus = 'pending' | 'processed' | 'error';

export type StripeEventRecord = {
  id: string;
  type: string;
  workspace_id: string | null;
  status: EventStatus;
  created_at: string;
  processed_at: string | null;
  error_message: string | null;
};

export async function ensureStripeEventLogged(event: Stripe.Event, workspaceId?: string | null) {
  const admin = getSupabaseAdmin();

  const { data: existing, error: selectError } = await admin
    .from('stripe_event_logs')
    .select('id, status')
    .eq('id', event.id)
    .maybeSingle();

  if (selectError && selectError.code !== 'PGRST116') {
    throw selectError;
  }

  if (existing) {
    return {
      alreadyHandled: existing.status === 'processed',
      status: existing.status as EventStatus,
    };
  }

  await admin.from('stripe_event_logs').insert({
    id: event.id,
    type: event.type,
    workspace_id: workspaceId ?? null,
    status: 'pending',
    payload: event,
  });

  return {
    alreadyHandled: false,
    status: 'pending' as EventStatus,
  };
}

export async function updateStripeEventStatus(eventId: string, status: EventStatus, errorMessage?: string) {
  const admin = getSupabaseAdmin();
  const processedAt = new Date().toISOString();
  await admin
    .from('stripe_event_logs')
    .update({
      status,
      error_message: errorMessage ?? null,
      processed_at: processedAt,
    })
    .eq('id', eventId);
}
