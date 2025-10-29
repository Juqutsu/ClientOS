import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';
import { env } from '@/lib/env';

// Simple in-memory rate limiter per IP
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests/minute
const ipHits: Map<string, { count: number; resetAt: number }> = new Map();

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // CSRF: require same-origin
  const origin = req.headers.get('origin') || '';
  const allowed = env.NEXT_PUBLIC_APP_URL;
  if (origin && !origin.startsWith(allowed)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Rate limit by IP
  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '').split(',')[0] || 'unknown';
  const now = Date.now();
  const rec = ipHits.get(ip);
  if (!rec || now > rec.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    if (rec.count >= RATE_LIMIT_MAX) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
    rec.count += 1;
    ipHits.set(ip, rec);
  }

  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const body = await req.json();
  const schema = z.object({ file_name: z.string().min(1), path: z.string().min(1) });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new NextResponse('Bad Request', { status: 400 });
  }
  const { file_name: fileName, path } = parsed.data;

  const publicUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/project-files/${encodeURI(path)}`;

  const { error } = await supabase.from('files').insert({
    project_id: params.id,
    file_name: fileName,
    file_url: publicUrl,
    uploaded_by: user.id,
  });

  if (error) return new NextResponse(error.message, { status: 400 });
  return NextResponse.json({ ok: true, file_url: publicUrl });
}
