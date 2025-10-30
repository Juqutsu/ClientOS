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
      <label className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg cursor-pointer font-medium transition-all ${
        uploading 
          ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
          : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg hover:shadow-xl hover:scale-105'
      }`}>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} disabled={uploading} />
        {uploading ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Hochladen…
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Avatar hochladen
          </>
        )}
      </label>
      {error ? (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      ) : null}
    </div>
  );
}
