import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function requireUser() {
  const supabase = getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    try {
      console.log(JSON.stringify({ tag: 'auth/requireUser/no-user' }, null, 0));
    } catch {}
    redirect('/auth/login');
  }
  return data.user;
}
