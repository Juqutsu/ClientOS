import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getTrialLengthDays, PLAN_DEFAULTS, resolveEntitlements, resolvePlanId } from '@/lib/billing/entitlements';

type Database = any;
type Schema = 'public';

type Client = SupabaseClient<Database, Schema, any>;

export type SubscriptionRow = {
  id: string;
  workspace_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string | null;
  plan: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  entitlements: Record<string, unknown> | null;
  updated_at: string | null;
};

export async function getWorkspaceSubscription(workspaceId: string, client: Client) {
  const { data, error } = await client
    .from('subscriptions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle<SubscriptionRow>();
  if (error) throw error;
  return data ?? null;
}

export async function ensureWorkspaceSubscription(workspaceId: string, options?: { client?: Client; trialPlan?: string }) {
  const client = options?.client ?? getSupabaseAdmin();
  const { data: existing } = await client
    .from('subscriptions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle<SubscriptionRow>();

  if (existing) {
    return existing;
  }

  const trialDays = getTrialLengthDays();
  const now = new Date();
  const trialEnds = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const planId = resolvePlanId(options?.trialPlan ?? 'starter');
  const defaults = PLAN_DEFAULTS[planId];

  const { data, error } = await client
    .from('subscriptions')
    .insert({
      workspace_id: workspaceId,
      plan: planId,
      status: 'trialing',
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnds.toISOString(),
      entitlements: defaults,
    })
    .select('*')
    .single<SubscriptionRow>();

  if (error) throw error;
  return data;
}

export async function refreshEntitlements(workspaceId: string, client?: Client) {
  const db = client ?? getSupabaseAdmin();
  const subscription = await getWorkspaceSubscription(workspaceId, db);
  if (!subscription) return null;
  const summary = resolveEntitlements(subscription);
  await db
    .from('subscriptions')
    .update({
      entitlements: summary.entitlements,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id);
  return summary;
}

export async function getEntitlementSummary(workspaceId: string, client?: Client) {
  const db = client ?? getSupabaseAdmin();
  let subscription = await getWorkspaceSubscription(workspaceId, db);
  if (!subscription) {
    subscription = await ensureWorkspaceSubscription(workspaceId, { client: db });
  }
  return resolveEntitlements(subscription);
}
