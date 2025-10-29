"use client";
import { useRef, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';

export default function AvatarUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Nur Bilder sind erlaubt');
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Maximal 5MB');
      return;
    }
    setUploading(true);
    try {
      const supabase = getSupabaseBrowser();
      const path = `avatars/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file);
      if (upErr) throw upErr;
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${encodeURI(path)}`;
      const res = await fetch('/api/profile/avatar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: publicUrl }) });
      if (!res.ok) throw new Error('Update fehlgeschlagen');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Upload fehlgeschlagen';
      setError(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer bg-white hover:bg-gray-50">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} disabled={uploading} />
        {uploading ? 'Hochladen…' : 'Avatar hochladen'}
      </label>
      {error ? <p className="text-sm text-red-600 mt-2">{error}</p> : null}
    </div>
  );
}
