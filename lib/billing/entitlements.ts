import { z } from 'zod';
import { env } from '@/lib/env';

export type PlanId = 'free' | 'starter' | 'pro';

export type Entitlements = {
  maxProjects: number | null;
  maxTeamMembers: number | null;
  maxFileSizeMb: number;
  maxStorageMb: number | null;
  maxDailyUploads: number | null;
};

export type SubscriptionLike = {
  plan: string | null;
  status: string | null;
  entitlements: unknown;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  stripe_subscription_id?: string | null;
};

export type TrialInfo = {
  isInTrial: boolean;
  trialEndsAt: Date | null;
  trialDaysRemaining: number | null;
};

export type EntitlementSummary = {
  plan: PlanId;
  entitlements: Entitlements;
  trial: TrialInfo;
  isActiveSubscriber: boolean;
};

export const DEFAULT_TRIAL_DAYS = 14;

export function getTrialLengthDays(): number {
  return env.TRIAL_LENGTH_DAYS ?? DEFAULT_TRIAL_DAYS;
}

const ENTITLEMENTS_SCHEMA = z.object({
  maxProjects: z.number().int().positive().nullable().default(null),
  maxTeamMembers: z.number().int().positive().nullable().default(null),
  maxFileSizeMb: z.number().int().positive().default(50),
  maxStorageMb: z.number().int().positive().nullable().default(null),
  maxDailyUploads: z.number().int().positive().nullable().default(null),
});

const PLAN_DEFAULTS: Record<PlanId, Entitlements> = {
  free: {
    maxProjects: 3,
    maxTeamMembers: 3,
    maxFileSizeMb: 25,
    maxStorageMb: 1024,
    maxDailyUploads: 25,
  },
  starter: {
    maxProjects: 10,
    maxTeamMembers: 10,
    maxFileSizeMb: 100,
    maxStorageMb: 5_000,
    maxDailyUploads: 250,
  },
  pro: {
    maxProjects: null,
    maxTeamMembers: null,
    maxFileSizeMb: 512,
    maxStorageMb: null,
    maxDailyUploads: null,
  },
};

const PLAN_ALIASES: Record<string, PlanId> = {
  free: 'free',
  starter: 'starter',
  pro: 'pro',
  basic: 'starter',
  premium: 'pro',
};

export function resolvePlanId(plan: string | null | undefined): PlanId {
  if (!plan) return 'free';
  const normalized = plan.toLowerCase();
  return PLAN_ALIASES[normalized] ?? 'starter';
}

function parseEntitlements(input: unknown, fallback: Entitlements): Entitlements {
  if (!input || typeof input !== 'object') {
    return fallback;
  }
  const parsed = ENTITLEMENTS_SCHEMA.safeParse(input);
  if (!parsed.success) {
    return fallback;
  }
  const candidate = parsed.data satisfies Entitlements;
  const result: Entitlements = { ...fallback };
  (Object.keys(result) as (keyof Entitlements)[]).forEach((key) => {
    const value = candidate[key];
    if (value === undefined || value === null) {
      result[key] = fallback[key];
      return;
    }
    if (typeof fallback[key] === 'number' || fallback[key] === null) {
      result[key] = value;
    }
  });
  return result;
}

function coerceDate(value: string | null): Date | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp);
}

export function getTrialInfo(subscription: SubscriptionLike | null): TrialInfo {
  const now = new Date();
  const trialEndsAt = coerceDate(subscription?.trial_ends_at ?? null);
  const status = subscription?.status ?? null;
  const isInTrial = Boolean(
    trialEndsAt && trialEndsAt.getTime() > now.getTime()
  ) || status === 'trialing';
  const trialDaysRemaining = isInTrial && trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;
  return {
    isInTrial,
    trialEndsAt,
    trialDaysRemaining,
  };
}

export function resolveEntitlements(subscription: SubscriptionLike | null): EntitlementSummary {
  let plan = resolvePlanId(subscription?.plan ?? null);
  const trial = getTrialInfo(subscription);
  const status = (subscription?.status ?? '').toLowerCase();
  const hasStripeSubscription = Boolean(subscription?.stripe_subscription_id);
  const trialExpired = !trial.isInTrial && status !== 'active';
  if (trialExpired && !hasStripeSubscription) {
    plan = 'free';
  }

  const base = PLAN_DEFAULTS[plan] ?? PLAN_DEFAULTS.free;
  const entitlements = parseEntitlements(subscription?.entitlements, base);
  const isActiveSubscriber = status === 'active' || (trial.isInTrial && (status === 'trialing' || status === 'past_due'));
  return {
    plan,
    entitlements,
    trial,
    isActiveSubscriber,
  };
}

export function withEntitlementOverrides(plan: PlanId, overrides: Partial<Entitlements> | null | undefined): Entitlements {
  const base = PLAN_DEFAULTS[plan];
  if (!overrides) return base;
  const merged: Entitlements = { ...base };
  (Object.entries(overrides) as [keyof Entitlements, number | null | undefined][]).forEach(([key, value]) => {
    if (value === undefined) return;
    merged[key] = value as Entitlements[typeof key];
  });
  return merged;
}

export { PLAN_DEFAULTS };
