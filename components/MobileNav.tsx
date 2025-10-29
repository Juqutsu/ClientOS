"use client";
import Link from 'next/link';
import { useState } from 'react';

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <Link href="/" className="font-semibold">Client Portal</Link>
        <button aria-label="Menü" className="p-2 border rounded-md" onClick={() => setOpen((v) => !v)}>
          ☰
        </button>
      </div>
      {open ? (
        <nav className="p-4 border-b bg-white space-y-2">
          <Link href="/dashboard" className="block px-2 py-1 rounded hover:bg-gray-100" onClick={() => setOpen(false)}>Dashboard</Link>
          <Link href="/pricing" className="block px-2 py-1 rounded hover:bg-gray-100" onClick={() => setOpen(false)}>Pricing</Link>
          <Link href="/settings/profile" className="block px-2 py-1 rounded hover:bg-gray-100" onClick={() => setOpen(false)}>Profil</Link>
          <Link href="/settings/workspace" className="block px-2 py-1 rounded hover:bg-gray-100" onClick={() => setOpen(false)}>Workspace</Link>
          <Link href="/settings/billing" className="block px-2 py-1 rounded hover:bg-gray-100" onClick={() => setOpen(false)}>Billing</Link>
        </nav>
      ) : null}
    </div>
  );
}
