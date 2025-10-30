"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import type { ReactNode } from 'react';

type WorkspaceOption = {
  id: string;
  name: string;
  role: string;
};

type Props = {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string | null;
  activeRole: string | null;
  switchWorkspaceAction: (formData: FormData) => Promise<void>;
};

export default function MobileNavClient({ workspaces, activeWorkspaceId, activeRole, switchWorkspaceAction }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(() => activeWorkspaceId || workspaces[0]?.id || '');
  const [isPending, startTransition] = useTransition();

  const activeWorkspaceName = useMemo(() => {
    const current = workspaces.find((ws) => ws.id === selectedWorkspace);
    return current ? `${current.name}${current.role !== 'owner' ? ` (${current.role})` : ''}` : null;
  }, [selectedWorkspace, workspaces]);

  useEffect(() => {
    if (activeWorkspaceId && activeWorkspaceId !== selectedWorkspace) {
      setSelectedWorkspace(activeWorkspaceId);
    }
    if (!activeWorkspaceId && workspaces.length && !selectedWorkspace) {
      setSelectedWorkspace(workspaces[0].id);
    }
  }, [activeWorkspaceId, workspaces, selectedWorkspace]);

  function handleWorkspaceChange(id: string) {
    setSelectedWorkspace(id);
    setOpen(false);
    startTransition(() => {
      const formData = new FormData();
      formData.append('workspace_id', id);
      void switchWorkspaceAction(formData);
    });
  }

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between p-4 border-b bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <Link
          href="/"
          className="font-bold text-lg bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent"
        >
          Client Portal
        </Link>
        <button
          aria-label="Menü"
          className="p-2 border-2 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
          onClick={() => setOpen((prev) => !prev)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      {open ? (
        <nav className="p-4 border-b bg-gradient-to-b from-white to-gray-50 space-y-4 animate-slide-down">
          {workspaces.length > 0 ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Workspace</label>
              <div className="relative">
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                  value={selectedWorkspace}
                  onChange={(event) => handleWorkspaceChange(event.target.value)}
                  disabled={isPending}
                >
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                      {workspace.role !== 'owner' ? ` (${workspace.role})` : ''}
                    </option>
                  ))}
                </select>
                {isPending ? (
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <svg className="w-4 h-4 text-primary-500 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  </div>
                ) : null}
              </div>
              {activeWorkspaceName ? (
                <p className="text-xs text-gray-500">
                  Aktiver Workspace: <span className="font-medium text-gray-700">{activeWorkspaceName}</span>
                </p>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Noch kein Workspace gefunden. <Link href="/settings/workspace" className="text-primary-600 underline">Workspace anlegen</Link>
            </div>
          )}

          <div className="space-y-1">
            <MobileNavLink
              href="/dashboard"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              }
              onNavigate={() => setOpen(false)}
            >
              Dashboard
            </MobileNavLink>
            <MobileNavLink
              href="/pricing"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              onNavigate={() => setOpen(false)}
            >
              Pricing
            </MobileNavLink>
            <MobileNavLink
              href="/settings/profile"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              onNavigate={() => setOpen(false)}
            >
              Profil
            </MobileNavLink>
            <MobileNavLink
              href="/settings/workspace"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              onNavigate={() => setOpen(false)}
            >
              Workspace
            </MobileNavLink>
            {(activeRole === 'owner' || activeRole === 'admin') && (
              <MobileNavLink
                href="/settings/billing"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                }
                onNavigate={() => setOpen(false)}
              >
                Billing
              </MobileNavLink>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function MobileNavLink({ href, icon, children, onNavigate }: { href: string; icon?: ReactNode; children: ReactNode; onNavigate: () => void }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50 transition-all font-medium text-gray-700 hover:text-primary-700"
      onClick={onNavigate}
    >
      {icon ? <span className="text-gray-500">{icon}</span> : null}
      {children}
    </Link>
  );
}
