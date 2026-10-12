'use client';

import { usePathname, useRouter } from 'next/navigation';
import { RadioTower } from 'lucide-react';
import { useDemoSession, destinationForRole } from '@/lib/demo-auth';
import { useDashboardStore } from '@/lib/dashboard-state';

export function BrandNavigation({ compact = false, className = '', onNavigate, 'aria-describedby': ariaDescribedBy }: { compact?: boolean; className?: string; onNavigate?: () => void; 'aria-describedby'?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useDemoSession();
  const setSelectedView = useDashboardStore(state => state.setSelectedView);

  function navigateHome() {
    onNavigate?.();
    if (!session) {
      router.replace('/login');
      return;
    }
    const destination = destinationForRole(session.role);
    if (session.role === 'organizer') {
      setSelectedView('home');
    } else if (pathname === destination) {
      window.dispatchEvent(new CustomEvent('runshow:workspace-tab', { detail: { tab: session.role === 'participant' ? 'events' : 'work' } }));
    }
    if (pathname !== destination) router.replace(destination);
  }

  return (
    <button type="button" onClick={navigateHome} aria-label="RUNSHOW home" aria-describedby={ariaDescribedBy} className={`group flex min-w-0 items-center gap-3 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${className}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--action-primary-fill)] text-[var(--action-primary-foreground)] transition-transform group-hover:scale-[1.03]">
        <RadioTower className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className={`block truncate text-lg font-bold leading-tight text-[var(--text-primary)] ${compact ? 'md:hidden' : ''}`}>RUNSHOW</span>
    </button>
  );
}
