import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

// Server-only admin client using service role. Never import this in client components.
export function getSupabaseAdmin() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
