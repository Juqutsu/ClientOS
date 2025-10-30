import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureWorkspaceSubscription } from '@/lib/billing/subscriptions';
import { PLAN_DEFAULTS, resolvePlanId } from '@/lib/billing/entitlements';
import { ensureStripeEventLogged, updateStripeEventStatus } from '@/lib/stripe/events';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!signature || !webhookSecret) {
    return new NextResponse('Missing webhook configuration', { status: 500 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature';
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  try {
    const workspaceId = await resolveWorkspaceId(event, admin);
    const logEntry = await ensureStripeEventLogged(event, workspaceId);
    if (logEntry.alreadyHandled) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await handleStripeEvent({ event, admin, stripe, workspaceId });
    await updateStripeEventStatus(event.id, 'processed');

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await updateStripeEventStatus(event.id, 'error', message);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }
}

type HandlerContext = {
  event: Stripe.Event;
  admin: SupabaseClient<any, 'public', any>;
  stripe: Stripe;
  workspaceId: string | null;
};

async function handleStripeEvent({ event, admin, stripe, workspaceId }: HandlerContext) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, { admin, stripe });
      break;
    case 'checkout.session.expired':
      await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session, admin);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.trial_will_end':
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription, event.type, admin, workspaceId);
      break;
    case 'invoice.payment_failed':
      await handleInvoiceFailed(event.data.object as Stripe.Invoice, admin);
      break;
    default:
      // ignore other events
      break;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, ctx: { admin: SupabaseClient<any, 'public', any>; stripe: Stripe }) {
  const workspaceId = session.client_reference_id as string | null;
  const subscriptionId = session.subscription as string | null;
  const customerId = session.customer as string | null;

  if (!workspaceId) {
    throw new Error('Checkout completed without workspace reference');
  }

  await ensureWorkspaceSubscription(workspaceId, { client: ctx.admin });

  let subscription: Stripe.Subscription | null = null;
  if (subscriptionId) {
    subscription = await ctx.stripe.subscriptions.retrieve(subscriptionId);
  }

  const planId = derivePlanId(subscription, session);
  const status = subscription?.status ?? 'active';
  const trialEndsAt = subscription?.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
  const trialStartedAt = subscription?.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null;

  await ctx.admin
    .from('subscriptions')
    .upsert({
      workspace_id: workspaceId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription?.id ?? subscriptionId,
      status,
      plan: planId,
      trial_started_at: trialStartedAt,
      trial_ends_at: trialEndsAt,
      entitlements: PLAN_DEFAULTS[planId],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id' });

  await logAuditEvent({
    workspaceId,
    action: 'billing.subscription_created',
    actorId: null,
    resourceType: 'subscription',
    resourceId: subscription?.id ?? subscriptionId ?? null,
    summary: 'Stripe Checkout abgeschlossen und Abo aktiviert',
    metadata: {
      status,
      plan: planId,
    },
  });
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session, admin: SupabaseClient<any, 'public', any>) {
  const customerId = session.customer as string | null;
  if (!customerId) return;
  const workspaceId = await fetchWorkspaceIdByCustomer(admin, customerId);
  await admin
    .from('subscriptions')
    .update({ status: 'incomplete_expired', updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId);
  if (workspaceId) {
    await logAuditEvent({
      workspaceId,
      action: 'billing.checkout_expired',
      actorId: null,
      resourceType: 'subscription',
      resourceId: customerId,
      summary: 'Checkout Session abgelaufen',
    });
  }
}

async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
  eventType: string,
  admin: SupabaseClient<any, 'public', any>,
  initialWorkspaceId: string | null
) {
  const customerId = subscription.customer as string | null;
  const workspaceId = initialWorkspaceId ?? (customerId ? await fetchWorkspaceIdByCustomer(admin, customerId) : null);
  if (!workspaceId) {
    throw new Error(`Unable to resolve workspace for subscription event ${eventType}`);
  }

  await ensureWorkspaceSubscription(workspaceId, { client: admin });

  const planId = derivePlanId(subscription, null);
  const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
  const trialStartedAt = subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null;

  await admin
    .from('subscriptions')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      plan: planId,
      trial_started_at: trialStartedAt ?? undefined,
      trial_ends_at: trialEndsAt ?? undefined,
      entitlements: PLAN_DEFAULTS[planId],
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId);

  const summary = subscriptionEventSummary(eventType, subscription.status);
  await logAuditEvent({
    workspaceId,
    action: `billing.${eventType}`,
    actorId: null,
    resourceType: 'subscription',
    resourceId: subscription.id,
    summary,
    metadata: {
      status: subscription.status,
      plan: planId,
      trialEndsAt,
    },
  });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice, admin: SupabaseClient<any, 'public', any>) {
  const customerId = invoice.customer as string | null;
  if (!customerId) return;
  const workspaceId = await fetchWorkspaceIdByCustomer(admin, customerId);
  await admin
    .from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId);

  if (workspaceId) {
    await logAuditEvent({
      workspaceId,
      action: 'billing.invoice_payment_failed',
      actorId: null,
      resourceType: 'invoice',
      resourceId: invoice.id,
      summary: 'Stripe Rechnung konnte nicht abgebucht werden',
      metadata: {
        amount_due: invoice.amount_due,
        currency: invoice.currency,
      },
    });
  }
}

async function resolveWorkspaceId(event: Stripe.Event, admin: SupabaseClient<any, 'public', any>) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.client_reference_id) {
        return session.client_reference_id;
      }
      if (session.customer) {
        return fetchWorkspaceIdByCustomer(admin, session.customer as string);
      }
      return null;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.trial_will_end': {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.metadata?.workspace_id) {
        return subscription.metadata.workspace_id;
      }
      if (subscription.customer) {
        return fetchWorkspaceIdByCustomer(admin, subscription.customer as string);
      }
      return null;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.customer) {
        return fetchWorkspaceIdByCustomer(admin, invoice.customer as string);
      }
      return null;
    }
    default:
      return null;
  }
}

async function fetchWorkspaceIdByCustomer(admin: SupabaseClient<any, 'public', any>, customerId: string) {
  if (!customerId) return null;
  const { data, error } = await admin
    .from('subscriptions')
    .select('workspace_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle<{ workspace_id: string }>();
  if (error) {
    console.error('[stripe] Failed to fetch workspace by customer', error);
    return null;
  }
  return data?.workspace_id ?? null;
}

function derivePlanId(subscription: Stripe.Subscription | null, session: Stripe.Checkout.Session | null): 'starter' | 'pro' | 'free' {
  const metadataPlan = subscription?.metadata?.plan || session?.metadata?.plan || null;
  if (metadataPlan) {
    return resolvePlanId(metadataPlan);
  }
  const priceId = subscription?.items?.data?.[0]?.price?.id || session?.metadata?.price_id || null;
  if (priceId && process.env.STRIPE_PRICE_ID && priceId === process.env.STRIPE_PRICE_ID) {
    return 'pro';
  }
  return 'starter';
}

function subscriptionEventSummary(eventType: string, status: string) {
  switch (eventType) {
    case 'customer.subscription.deleted':
      return 'Stripe Abo gekündigt';
    case 'customer.subscription.trial_will_end':
      return 'Stripe Testphase endet bald';
    case 'customer.subscription.updated':
    default:
      return `Stripe Abo aktualisiert (${status})`;
  }
}
