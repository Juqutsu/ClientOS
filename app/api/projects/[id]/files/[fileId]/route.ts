import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const sanitizeFolder = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes('..')) {
    throw new Error('Ordnername enthält unzulässige Zeichen.');
  }
  if (!/^[\w\-\/\s]{1,120}$/.test(trimmed)) {
    throw new Error("Ordnernamen dürfen nur Buchstaben, Zahlen, Leerzeichen, '-' und '/' enthalten.");
  }
  return trimmed.replace(/\s{2,}/g, ' ');
};

const sanitizeTags = (tags: string[] | undefined) => {
  if (!tags) return [] as string[];
  const filtered = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && tag.length <= 40);
  return Array.from(new Set(filtered)).slice(0, 20);
};

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; fileId: string } }
) {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const body = await req.json();
  const schema = z.object({
    folder: z.string().max(120).nullable().optional(),
    tags: z.array(z.string()).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  let folderValue: string | null = null;
  try {
    folderValue = parsed.data.folder ? sanitizeFolder(parsed.data.folder) : null;
  } catch (error) {
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 });
    }
    throw error;
  }

  const tags = sanitizeTags(parsed.data.tags);

  const { data, error } = await supabase
    .from('files')
    .update({
      folder: folderValue,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.fileId)
    .eq('project_id', params.id)
    .select('id, project_id, file_name, file_url, preview_url, folder, tags, mime_type, file_size, scan_status, created_at, updated_at')
    .single();

  if (error) {
    return new NextResponse(error.message, { status: 400 });
  }

  return NextResponse.json({ file: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; fileId: string } }
) {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { data: file, error: selectError } = await supabase
    .from('files')
    .select('id, file_url')
    .eq('id', params.fileId)
    .eq('project_id', params.id)
    .maybeSingle();

  if (selectError) {
    return new NextResponse(selectError.message, { status: 400 });
  }

  if (!file) {
    return new NextResponse('Not Found', { status: 404 });
  }

  if (file.file_url) {
    const marker = '/project-files/';
    const index = file.file_url.indexOf(marker);
    if (index !== -1) {
      const storagePath = decodeURIComponent(file.file_url.slice(index + marker.length));
      await supabase.storage.from('project-files').remove([storagePath]);
    }
  }

  const { error: deleteError } = await supabase
    .from('files')
    .delete()
    .eq('id', params.fileId)
    .eq('project_id', params.id);

  if (deleteError) {
    return new NextResponse(deleteError.message, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
