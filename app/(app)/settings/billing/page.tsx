import { requireUser } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import { getSupabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function BillingPage() {
  await requireUser();

  async function startCheckout() {
    'use server';
    const supabase = getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Find workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    const workspaceId = membership?.workspace_id;
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

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Abrechnung</h1>
      <form action={startCheckout}>
        <button type="submit" className="px-4 py-2 rounded-md bg-black text-white">Upgrade auf Starter</button>
      </form>
    </main>
  );
}
