'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { clearDemoSession } from '@/lib/demo-auth';

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  const logout = () => {
    clearDemoSession();
    router.replace('/login');
  };

  return (
    <Button type="button" variant="secondary" size="sm" onClick={logout} className={`${compact ? 'w-full md:h-10 md:w-10 md:p-0' : 'w-full'}`} aria-label="Sign out" title={compact ? 'Sign out' : undefined}>
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span className={compact ? 'md:hidden' : ''}>Sign out</span>
    </Button>
  );
}
