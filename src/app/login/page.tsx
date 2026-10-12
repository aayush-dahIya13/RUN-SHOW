'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, RadioTower } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { authenticateDemo, DEMO_ACCOUNTS, destinationForRole, saveDemoSession, useDemoSession } from '@/lib/demo-auth';
import { useDashboardStore } from '@/lib/dashboard-state';

export default function LoginPage() {
  const router = useRouter();
  const session = useDemoSession();
  const [accountEmail, setAccountEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session) router.replace(destinationForRole(session.role));
  }, [router, session]);

  const selectedAccount = DEMO_ACCOUNTS.find(account => account.email === accountEmail) ?? DEMO_ACCOUNTS[0];

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const authenticatedSession = await authenticateDemo(email, password);
      if (!authenticatedSession) {
        setIsSubmitting(false);
        setError('That email and password do not match an active demo account. Check the supplied credentials.');
        return;
      }

      if (authenticatedSession.role === 'organizer') {
        useDashboardStore.getState().setSelectedView('overview');
      }
      saveDemoSession(authenticatedSession);
      router.replace(destinationForRole(authenticatedSession.role));
    } catch {
      setIsSubmitting(false);
      setError('Demo sign-in could not be completed. Please try again.');
    }
  };

  if (session) return null;

  return (
    <main className="relative min-h-screen grid place-items-center bg-[var(--page-bg)] px-4 py-16 text-[var(--text-primary)]">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <header className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--action-primary)] text-[var(--action-primary-foreground)]">
            <RadioTower className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--action-primary)]">RUNSHOW</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">Intelligent Event Command Centre</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Sign in to continue to your event workspace.</p>
        </header>

        <Card variant="glass" padding="md">
          <CardContent>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Sign in</h2>
              <span className="rounded-full border border-[var(--accent)] bg-[var(--accent-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-foreground)]">DEMO</span>
            </div>

            <div className="mb-5 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">Choose a demo account</p>
              <Select
                label="Account type"
                value={accountEmail}
                onChange={event => {
                  const account = DEMO_ACCOUNTS.find(option => option.email === event.target.value) ?? DEMO_ACCOUNTS[0];
                  setAccountEmail(account.email);
                  setEmail(account.email);
                  setPassword(account.password);
                  setError('');
                }}
                options={DEMO_ACCOUNTS.map(account => ({ value: account.email, label: account.name }))}
              />
              <p className="text-xs text-[var(--text-secondary)]">
                Demo credentials: <span className="font-mono text-[var(--text-primary)]">{selectedAccount.email}</span> / <span className="font-mono text-[var(--text-primary)]">{selectedAccount.password}</span>
              </p>
              <p className="text-xs text-[var(--text-secondary)]">Organizer-created sub-organizer accounts use a one-time password shown by the organizer and can be entered below.</p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              <Input
                id="login-email"
                label="Email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
              />

              <div className="relative">
                <Input
                  id="login-password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="pr-12"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-[2.1rem] inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                  onClick={() => setShowPassword(value => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>

              {error && <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            <p className="mt-4 text-xs leading-relaxed text-[var(--text-muted)]">
              Demo sign-in is for prototype navigation only. It does not provide production authentication or secure authorization.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
