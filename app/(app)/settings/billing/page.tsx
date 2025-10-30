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
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-primary-900 bg-clip-text text-transparent flex items-center gap-3">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Abrechnung & Abo
          </h1>
          <p className="text-gray-600 mt-2">Verwalte dein Abonnement und Zahlungsinformationen</p>
        </div>

        <div className="card-gradient p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Aktiver Plan
          </h2>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Aktueller Plan</div>
                <div className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent capitalize">
                  {subscription?.plan || 'Free'}
                </div>
              </div>
              <div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${
                  isActive 
                    ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-2 border-green-300' 
                    : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-2 border-gray-300'
                }`}>
                  {isActive ? '✓ Aktiv' : 'Inaktiv'}
                </span>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t flex flex-wrap gap-3">
              {!isActive ? (
                <form action={startCheckout}>
                  <button type="submit" className="btn-primary">
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Auf Pro upgraden
                    </span>
                  </button>
                </form>
              ) : null}
              {subscription?.stripe_customer_id ? (
                <form action={openPortal}>
                  <button type="submit" className="btn-outline">
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Abo verwalten
                    </span>
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>

        {!isActive && (
          <div className="card-gradient p-8 border-2 border-primary-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Upgrade auf Pro
            </h3>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-gray-700">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Unbegrenzte Projekte
              </li>
              <li className="flex items-center gap-2 text-gray-700">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Priorisierter Support
              </li>
              <li className="flex items-center gap-2 text-gray-700">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Premium-Features
              </li>
            </ul>
            <p className="text-sm text-gray-600">Jederzeit kündbar. Keine versteckten Kosten.</p>
          </div>
        )}
      </div>
    </main>
  );
}
