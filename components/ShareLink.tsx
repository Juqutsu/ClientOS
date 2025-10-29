"use client";

import { useState } from 'react';

type Props = { shareId: string };

export default function ShareLink({ shareId }: Props) {
  const [copied, setCopied] = useState(false);
  const url = `${process.env.NEXT_PUBLIC_APP_URL || ''}/share/${shareId}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2">
      <input readOnly value={url} className="w-full border rounded-md px-3 py-2" />
      <button onClick={copy} className="px-3 py-2 border rounded-md bg-white hover:bg-gray-50">
        {copied ? 'Kopiert!' : 'Kopieren'}
      </button>
    </div>
  );
}
