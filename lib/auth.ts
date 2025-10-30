import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function requireUser() {
  const supabase = getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect('/auth/login');
  }
  return data.user;
}
