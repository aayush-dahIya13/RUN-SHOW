'use client';

import { RadioTower } from 'lucide-react';
import { DemoRole, useDemoSession } from '@/lib/demo-auth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Card, CardContent } from '@/components/ui/Card';

const ROLE_TITLES: Record<Exclude<DemoRole, 'organizer'>, string> = {
  sub_organizer: 'Sub-organizer Dashboard',
  participant: 'Participant Dashboard',
};

export function RoleDashboardPlaceholder({ role }: { role: Exclude<DemoRole, 'organizer'> }) {
  const session = useDemoSession();

  return (
    <ProtectedRoute role={role}>
      <main className="min-h-screen bg-[var(--page-bg)] px-5 py-6 text-[var(--text-primary)]">
        <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 border-b border-[var(--divider)] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--action-primary)] text-[var(--action-primary-foreground)]">
              <RadioTower className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide">RUNSHOW</p>
              <p className="text-xs text-[var(--text-secondary)]">Intelligent Event Command Centre</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        <section className="mx-auto mt-10 max-w-5xl">
          <p className="text-sm text-[var(--text-secondary)]">Signed in as {session?.name}</p>
          <h1 className="mt-1 text-2xl font-bold">{ROLE_TITLES[role]}</h1>
          <Card variant="glass" padding="md" className="mt-6 max-w-2xl">
            <CardContent>
              <h2 className="font-semibold">Role workspace</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                This {role === 'participant' ? 'participant' : 'sub-organizer'} workspace is not available on this page. Your sign-in is role-restricted and does not open the organizer workspace.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </ProtectedRoute>
  );
}
