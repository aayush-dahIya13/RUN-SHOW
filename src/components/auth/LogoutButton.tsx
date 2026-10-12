'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { clearDemoSession } from '@/lib/demo-auth';

export function LogoutButton() {
  const router = useRouter();

  const logout = () => {
    clearDemoSession();
    router.replace('/login');
  };

  return (
    <Button type="button" variant="secondary" size="sm" onClick={logout}>
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Sign out
    </Button>
  );
}
