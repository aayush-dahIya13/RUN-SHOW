'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { DemoSession } from '@/lib/demo-auth';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { RunshowAssistant } from '@/components/assistant/RunshowAssistant';
import { BrandNavigation } from '@/components/layout/BrandNavigation';
import type { LucideIcon } from 'lucide-react';

export interface WorkspaceTab { id: string; label: string; icon?: LucideIcon }

export function RoleWorkspaceFrame({ title, session, tabs, activeTab, onTabChange, children, sidebar = false }: {
  title: string; session: DemoSession | null; tabs: WorkspaceTab[]; activeTab: string; onTabChange: (id: string) => void; children: ReactNode; sidebar?: boolean;
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

  const navigation = (vertical: boolean) => <nav aria-label={`${title} navigation`} className={vertical ? 'space-y-1' : 'mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6'}>{tabs.map(tab => {
    const Icon = tab.icon;
    return <button key={tab.id} type="button" onClick={() => onTabChange(tab.id)} aria-current={activeTab === tab.id ? 'page' : undefined} className={`${vertical ? 'flex min-h-11 w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left' : 'shrink-0 border-b-2 px-3 py-3'} text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus)] ${activeTab === tab.id ? 'border-[var(--action-primary)] bg-[var(--surface-elevated)] text-[var(--action-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'}`}>{Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true"/>}{tab.label}</button>;
  })}</nav>;

  return <main ref={mainRef} data-heading-compact="false" className="flex min-h-dvh flex-col overflow-x-hidden bg-[var(--page-bg)] text-[var(--text-primary)]">
    <header className="border-b border-[var(--divider)] bg-[var(--surface-card)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3"><BrandNavigation className="shrink-0" /><p className="min-w-0 truncate text-xs text-[var(--text-secondary)]">{title} · {session?.name || 'Account'}</p></div>
        <div className="flex items-center gap-2"><ThemeToggle /><LogoutButton /></div>
      </div>
      {!sidebar && navigation(false)}
    </header>
    {sidebar ? <div className="flex min-h-0 flex-1"><aside className="hidden w-64 shrink-0 border-r border-[var(--divider)] bg-[var(--sidebar-bg)] p-4 md:block">{navigation(true)}</aside><nav className="fixed inset-x-0 bottom-0 z-20 flex gap-1 overflow-x-auto border-t border-[var(--divider)] bg-[var(--surface-card)] px-2 py-1 md:hidden" aria-label={`${title} navigation`}>{tabs.map(tab => { const Icon=tab.icon; return <button key={tab.id} type="button" onClick={() => onTabChange(tab.id)} aria-current={activeTab===tab.id?'page':undefined} className={`flex min-w-16 flex-1 flex-col items-center gap-1 rounded-md px-2 py-2 text-[10px] ${activeTab===tab.id?'text-[var(--action-primary)]':'text-[var(--text-secondary)]'}`}>{Icon&&<Icon className="h-4 w-4" aria-hidden="true"/>}{tab.label}</button>; })}</nav><section className="min-w-0 flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-6 md:pb-8"><div className="mx-auto max-w-6xl">{children}</div></section></div> : <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:py-8">{children}</div>}
    <RunshowAssistant />
  </main>;
}
