import { requireUser } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import { getSupabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function BillingPage() {
  await requireUser();
  const supabase = getSupabaseServer();

  // Determine active workspace & subscription to render status
  const cookieStore = cookies();
  const activeCookie = cookieStore.get('active_ws')?.value || null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let workspaceId: string | null = activeCookie as string | null;
  if (!workspaceId && user) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    workspaceId = membership?.workspace_id || null;
  }
  type SubscriptionRow = { status: string | null; plan: string | null; stripe_customer_id: string | null };
  let subscription: SubscriptionRow | null = null;
  if (workspaceId) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    subscription = (data as unknown as SubscriptionRow) || null;
  }

  async function startCheckout() {
    'use server';
    const supabase = getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Determine active workspace
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
    if (!workspaceId) return;

    // Find or create subscription row
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id || undefined;
    const stripe = getStripe();
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { workspace_id: workspaceId },
      });
      customerId = customer.id;
      await supabase
        .from('subscriptions')
        .upsert({ workspace_id: workspaceId, stripe_customer_id: customerId, status: 'inactive', plan: 'starter' });
    }

    const price = process.env.STRIPE_PRICE_ID!;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: workspaceId,
      allow_promotion_codes: true,
      line_items: [{ price, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?success=1`,
      cancel_url: `${appUrl}/settings/billing?canceled=1`,
    });

    redirect(session.url!);
  }

  async function openPortal() {
    'use server';
    const supabase = getSupabaseServer();
    const stripe = getStripe();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const cookieStore = cookies();
    const activeCookie = cookieStore.get('active_ws')?.value || null;
    let workspaceId: string | null = activeCookie as string | null;
    if (!workspaceId) {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      workspaceId = membership?.workspace_id || null;
    }
    if (!workspaceId) return;
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!sub?.stripe_customer_id) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}/settings/billing`,
    });
    redirect(portal.url);
  }

  const status = subscription?.status || 'inactive';
  const isActive = status === 'active' || status === 'trialing';

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Abrechnung</h1>
      <div className="border rounded-lg p-4 max-w-xl bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Aktueller Plan</div>
            <div className="font-medium">{subscription?.plan || 'starter'}</div>
          </div>
          <div>
            <span className={`text-xs px-2 py-1 rounded ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{status}</span>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {!isActive ? (
            <form action={startCheckout}>
              <button type="submit" className="px-4 py-2 rounded-md bg-black text-white">Upgrade auf Starter</button>
            </form>
          ) : null}
          {subscription?.stripe_customer_id ? (
            <form action={openPortal}>
              <button type="submit" className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50">Abo verwalten</button>
            </form>
          ) : null}
        </div>
      </div>
    </main>
  );
}
