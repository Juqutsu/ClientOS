import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';

const payloadSchema = z.object({
  path: z.string().min(5),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from('users')
    .select('avatar_storage_path')
    .eq('id', user.id)
    .maybeSingle<{ avatar_storage_path: string | null }>();

  const previousPath = profile?.avatar_storage_path || null;
  const targetPath = parsed.data.path;

  if (previousPath && previousPath !== targetPath) {
    await admin.storage.from('avatars').remove([previousPath]);
  }

  const { data: signed, error: signedError } = await admin.storage
    .from('avatars')
    .createSignedUrl(targetPath, 60 * 60);

  if (signedError || !signed?.signedUrl) {
    const message = signedError?.message || 'Fehler beim Erstellen der Avatar-URL';
    return new NextResponse(message, { status: 400 });
  }

  await admin
    .from('users')
    .upsert({
      id: user.id,
      email: user.email,
      avatar_storage_path: targetPath,
      avatar_url: signed.signedUrl,
    });

  const workspaceId = await resolveWorkspaceId(admin, user.id);
  if (workspaceId) {
    await logAuditEvent({
      workspaceId,
      action: 'profile.avatar_updated',
      actorId: user.id,
      resourceType: 'user',
      resourceId: user.id,
      summary: 'Avatar aktualisiert',
    }, admin);
  }

  return NextResponse.json({ avatarUrl: signed.signedUrl });
}

async function resolveWorkspaceId(admin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle<{ workspace_id: string }>();
  return data?.workspace_id ?? null;
}
