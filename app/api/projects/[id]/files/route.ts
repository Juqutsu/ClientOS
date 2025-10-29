import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const body = await req.json();
  const fileName = String(body.file_name || '');
  const path = String(body.path || '');
  if (!fileName || !path) return new NextResponse('Bad Request', { status: 400 });

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/project-files/${encodeURI(path)}`;

  const { error } = await supabase.from('files').insert({
    project_id: params.id,
    file_name: fileName,
    file_url: publicUrl,
    uploaded_by: user.id,
  });

  if (error) return new NextResponse(error.message, { status: 400 });
  return NextResponse.json({ ok: true, file_url: publicUrl });
}
