import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getEntitlementSummary } from '@/lib/billing/subscriptions';
import { logAuditEvent } from '@/lib/audit';

// Simple in-memory rate limiter per IP
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests/minute
const ipHits: Map<string, { count: number; resetAt: number }> = new Map();

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
];

const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'docx', 'xlsx', 'txt', 'zip'];

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

  const { data: projectRow } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', params.id)
    .maybeSingle<{ workspace_id: string }>();

  if (!projectRow?.workspace_id) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const admin = getSupabaseAdmin();
  const entitlementSummary = await getEntitlementSummary(projectRow.workspace_id, admin);
  const { entitlements } = entitlementSummary;
  const maxFileSizeBytes = (entitlements.maxFileSizeMb ?? Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50')) * 1024 * 1024;

  const body = await req.json();
  const schema = z.object({
    file_name: z.string().min(1).max(255),
    path: z.string().min(1),
    mime_type: z.string().max(255).nullable().optional(),
    file_size: z.number().int().nonnegative().optional(),
    folder: z.string().max(120).nullable().optional(),
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const { file_name: fileName, path, mime_type: rawMime, file_size: rawSize, folder: rawFolder, tags: rawTags } = parsed.data;

  if (rawSize && rawSize > maxFileSizeBytes) {
    return new NextResponse(`Datei überschreitet das Größenlimit (${entitlements.maxFileSizeMb ?? Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50')}MB)`, { status: 400 });
  }

  if (entitlements.maxDailyUploads !== null) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: workspaceProjects } = await admin
      .from('projects')
      .select('id')
      .eq('workspace_id', projectRow.workspace_id);
    const projectIds = (workspaceProjects || []).map((p) => p.id);
    if (projectIds.length) {
      const { count: uploadsInWindow } = await admin
        .from('files')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .gte('created_at', since);
      if ((uploadsInWindow || 0) >= entitlements.maxDailyUploads) {
        return new NextResponse('Tageslimit für Uploads erreicht. Bitte später erneut versuchen oder upgraden.', { status: 429 });
      }
    }
  }

  const extension = fileName.split('.').pop()?.toLowerCase();
  const mimeType = rawMime || (extension ? guessMimeFromExtension(extension) : null);

  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return new NextResponse('Dateityp nicht erlaubt', { status: 400 });
    }
  } else if (!mimeType && extension && !ALLOWED_EXTENSIONS.includes(extension)) {
    return new NextResponse('Dateityp nicht erlaubt', { status: 400 });
  }

  const folder = rawFolder ? sanitizeFolder(rawFolder) : null;
  const tags = uniqueStrings((rawTags ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0));

  const storagePath = path;
  const { data: signedUrlData, error: signedUrlError } = await admin
    .storage
    .from('project-files')
    .createSignedUrl(storagePath, 60 * 60 * 6);
  if (signedUrlError) {
    return new NextResponse('Konnte keine Zugriff-URL generieren', { status: 400 });
  }
  const signedUrl = signedUrlData?.signedUrl ?? null;
  const previewUrl = signedUrl && (mimeType?.startsWith('image/') || mimeType === 'application/pdf') ? signedUrl : null;

  const { data: fileRecord, error } = await supabase
    .from('files')
    .insert({
      project_id: params.id,
      file_name: fileName,
      file_url: signedUrl,
      storage_path: storagePath,
      preview_url: previewUrl,
      uploaded_by: user.id,
      mime_type: mimeType,
      file_size: rawSize ?? null,
      folder,
      tags,
      scan_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .select('id, project_id, file_name, file_url, storage_path, preview_url, folder, tags, mime_type, file_size, scan_status, created_at, updated_at')
    .single();

  if (error) {
    return new NextResponse(error.message, { status: 400 });
  }

  await logAuditEvent({
    workspaceId: projectRow.workspace_id,
    action: 'files.uploaded',
    actorId: user.id,
    resourceType: 'file',
    resourceId: fileRecord.id,
    summary: `Datei ${fileName} hochgeladen`,
    metadata: {
      project_id: params.id,
      file_size: rawSize ?? null,
      mime_type: mimeType,
    },
  }, admin);

  triggerVirusScan({
    fileId: fileRecord.id,
    projectId: params.id,
    storagePath,
    publicUrl: signedUrl || '',
    mimeType,
    fileSize: rawSize ?? null,
    userId: user.id,
    tags,
  }).catch((scanError) => {
    console.error('Virus scan webhook failed', scanError);
  });

  return NextResponse.json({ file: fileRecord });
}

function sanitizeFolder(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Ordnername darf nicht leer sein.');
  }
  if (trimmed.includes('..')) {
    throw new Error('Ordnername enthält unzulässige Zeichen.');
  }
  if (!/^[\w\-\/\s]{1,120}$/.test(trimmed)) {
    throw new Error("Ordnernamen dürfen nur Buchstaben, Zahlen, Leerzeichen, '-' und '/' enthalten.");
  }
  return trimmed.replace(/\s{2,}/g, ' ');
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values)).slice(0, 20);
}

function guessMimeFromExtension(extension: string | undefined): string | null {
  if (!extension) return null;
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'txt':
      return 'text/plain';
    case 'zip':
      return 'application/zip';
    default:
      return null;
  }
}

async function triggerVirusScan(payload: {
  fileId: string;
  projectId: string;
  storagePath: string;
  publicUrl: string;
  mimeType: string | null;
  fileSize: number | null;
  userId: string;
  tags: string[];
}) {
  const webhookUrl = env.FILE_SCAN_WEBHOOK_URL;
  if (!webhookUrl) return;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(env.FILE_SCAN_WEBHOOK_SECRET ? { 'x-api-key': env.FILE_SCAN_WEBHOOK_SECRET } : {}),
    },
    body: JSON.stringify(payload),
  });
}
