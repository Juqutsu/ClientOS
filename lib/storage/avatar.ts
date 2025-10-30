import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const AVATAR_BUCKET = 'avatars';
const DEFAULT_EXPIRES_SECONDS = 60 * 60; // 1 hour

type StorageClient = SupabaseClient<any, 'public', any>;

export function getAvatarBucket() {
  return AVATAR_BUCKET;
}

export async function getSignedAvatarUrl(
  storagePath: string | null | undefined,
  options?: { expiresIn?: number; client?: StorageClient }
): Promise<string | null> {
  if (!storagePath) return null;
  const expiresIn = options?.expiresIn ?? DEFAULT_EXPIRES_SECONDS;
  const client = options?.client ?? getSupabaseAdmin();
  try {
    const { data, error } = await client.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(storagePath, expiresIn);
    if (error || !data?.signedUrl) {
      if (error) {
        console.error('[avatar] Failed to create signed URL', error);
      }
      return null;
    }
    return data.signedUrl;
  } catch (error) {
    console.error('[avatar] Unexpected error while signing URL', error);
    return null;
  }
}

export function buildAvatarPath(userId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]+/g, '_');
  return `${userId}/${Date.now()}_${safeName}`;
}
