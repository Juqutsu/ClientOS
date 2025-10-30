import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const nextRaw = url.searchParams.get('next');
  const next = nextRaw && nextRaw.startsWith('/') ? nextRaw : null;
  const supabase = getSupabaseServer();

  try {
    try {
      console.log(
        JSON.stringify(
          {
            tag: 'auth/callback/start',
            origin: url.origin,
            next,
            hasCode: !!url.searchParams.get('code'),
            type: url.searchParams.get('type') || null,
            preCookies: cookies().getAll().map((c) => c.name),
          },
          null,
          0
        )
      );
    } catch {}
    const code = url.searchParams.get('code');
    if (!code) {
      return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent('Kein Code')}`, url.origin));
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }
    try {
      console.log(
        JSON.stringify(
          {
            tag: 'auth/callback/exchanged',
            postCookies: cookies().getAll().map((c) => c.name),
          },
          null,
          0
        )
      );
    } catch {}
    const destination = next || (url.searchParams.get('type') === 'recovery' ? '/auth/reset' : '/dashboard');
    return NextResponse.redirect(new URL(destination, url.origin));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unbekannter Fehler';
    return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(message)}`, url.origin));
  }
}
