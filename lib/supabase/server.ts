import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function getSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies) {
          // In Next.js, cookies().set is only allowed in Route Handlers and Server Actions.
          // When this helper is used from a Server Component (e.g. layout/page) we must
          // no-op on writes to avoid runtime errors. Supabase will still be able to read
          // the session; any auth flows that need to write cookies should be done via
          // a Server Action or Route Handler.
          try {
            cookies.forEach(({ name, value, options }) => {
              cookieStore.set({ name, value, ...options });
            });
          } catch {
            // ignore write attempts outside of a mutable cookies context
          }
        },
      },
    }
  );
}
