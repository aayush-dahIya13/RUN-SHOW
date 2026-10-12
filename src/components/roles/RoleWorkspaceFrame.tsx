'use client';

import { RadioTower } from 'lucide-react';
import { ReactNode, useEffect, useRef } from 'react';
import { DemoSession } from '@/lib/demo-auth';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { RunshowAssistant } from '@/components/assistant/RunshowAssistant';

export interface WorkspaceTab { id: string; label: string }

export function RoleWorkspaceFrame({ title, session, tabs, activeTab, onTabChange, children }: {
  title: string; session: DemoSession | null; tabs: WorkspaceTab[]; activeTab: string; onTabChange: (id: string) => void; children: ReactNode;
}) {
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const handleGuidedNavigation = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: string }>).detail?.tab;
      if (tab && tabs.some(item => item.id === tab)) onTabChange(tab);
    };
    window.addEventListener('runshow:workspace-tab', handleGuidedNavigation);
    return () => window.removeEventListener('runshow:workspace-tab', handleGuidedNavigation);
  }, [onTabChange, tabs]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const updateHeading = () => {
      const compact = window.scrollY > 24;
      if ((main.dataset.headingCompact === 'true') !== compact) {
        main.dataset.headingCompact = String(compact);
      }
    };
    updateHeading();
    window.addEventListener('scroll', updateHeading, { passive: true });
    return () => window.removeEventListener('scroll', updateHeading);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (mainRef.current) mainRef.current.dataset.headingCompact = 'false';
  }, [activeTab]);

  return <main ref={mainRef} data-heading-compact="false" className="min-h-dvh overflow-x-hidden bg-[var(--page-bg)] text-[var(--text-primary)]">
    <header className="border-b border-[var(--divider)] bg-[var(--surface-card)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--action-primary-fill)] text-[var(--action-primary-foreground)]"><RadioTower className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><p className="text-sm font-bold">RUNSHOW</p><p className="truncate text-xs text-[var(--text-secondary)]">{title} · {session?.name}</p></div></div>
        <div className="flex items-center gap-2"><ThemeToggle /><LogoutButton /></div>
      </div>
      <nav aria-label={`${title} navigation`} className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">{tabs.map(tab => <button key={tab.id} type="button" onClick={() => onTabChange(tab.id)} aria-current={activeTab === tab.id ? 'page' : undefined} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--focus)] ${activeTab === tab.id ? 'border-[var(--action-primary)] text-[var(--action-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>{tab.label}</button>)}</nav>
    </header>
    <div className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-28">{children}<p className="mt-8 border-t border-[var(--divider)] pt-4 text-xs text-[var(--text-muted)]">Demo workspace. Role filtering and route guards run in the browser and are not production authorization.</p></div>
    <RunshowAssistant />
  </main>;
}
