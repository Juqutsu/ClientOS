import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';
import { env } from '@/lib/env';

export async function POST(req: Request) {
  const origin = req.headers.get('origin') || '';
  if (origin && !origin.startsWith(env.NEXT_PUBLIC_APP_URL)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  const body = await req.json();
  const schema = z.object({ url: z.string().url() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new NextResponse('Bad Request', { status: 400 });
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  const { error } = await supabase.from('users').upsert({ id: user.id, avatar_url: parsed.data.url, email: user.email });
  if (error) return new NextResponse(error.message, { status: 400 });
  return NextResponse.json({ ok: true });
}
