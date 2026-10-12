'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DemoRole, destinationForRole, useDemoSession } from '@/lib/demo-auth';

export function ProtectedRoute({ role, children }: { role: DemoRole; children: React.ReactNode }) {
  const router = useRouter();
  const session = useDemoSession();
  const authorized = session?.role === role;

  useEffect(() => {
    if (!session) router.replace('/login');
    else if (session.role !== role) router.replace(destinationForRole(session.role));
  }, [role, router, session]);

  if (!authorized) {
    return (
      <main className="min-h-screen grid place-items-center bg-[var(--page-bg)] text-[var(--text-secondary)]" aria-live="polite">
        Checking account…
      </main>
    );
  }

  return children;
}
