'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Bell, ShieldCheck, Mail, CalendarDays, RadioTower, LogOut, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { useDemoSession } from '@/lib/demo-auth';
import { useAuthStore } from '@/lib/auth-store';
import { useTheme } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function ParticipantSettingsView() {
  const session = useDemoSession();
  const { logout } = useAuthStore();
  const { theme, setTheme } = useTheme();

  // Settings state
  const [appearance, setAppearance] = useState<'light' | 'dark' | 'system'>('system');
  const [notifications, setNotifications] = useState({
    announcements: true,
    scheduleChanges: true,
    reminders: true,
    email: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const savedAppearance = localStorage.getItem('participant-appearance') as 'light' | 'dark' | 'system' | null;
      if (savedAppearance) {
        setAppearance(savedAppearance);
        if (savedAppearance !== 'system') setTheme(savedAppearance);
      } else if (theme) {
        setAppearance(theme);
      }
    } catch { /* Storage unavailable */ }

    try {
      const savedNotifications = localStorage.getItem('participant-notifications');
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }
    } catch { /* Storage unavailable */ }
  }, [theme, setTheme]);

  const handleSaveAppearance = () => {
    setError('');
    setSuccess('');
    try {
      localStorage.setItem('participant-appearance', appearance);
      if (appearance !== 'system') setTheme(appearance);
      setSuccess('Appearance settings saved');
    } catch {
      setError('Failed to save appearance settings');
    }
  };

  const handleSaveNotifications = () => {
    setError('');
    setSuccess('');
    try {
      localStorage.setItem('participant-notifications', JSON.stringify(notifications));
      setSuccess('Notification preferences saved (demo mode - frontend only)');
    } catch {
      setError('Failed to save notification preferences');
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="space-y-6">
      {/* Appearance Section */}
      <Card padding="md">
        <h2 className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
          <Monitor className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
          Appearance
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Choose your preferred color theme</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { value: 'light' as const, label: 'Light', icon: Sun, description: 'Always use light mode' },
            { value: 'dark' as const, label: 'Dark', icon: Moon, description: 'Always use dark mode' },
            { value: 'system' as const, label: 'System', icon: Monitor, description: 'Match system preference' },
          ].map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAppearance(option.value)}
              className={`relative p-4 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--focus)] ${
                appearance === option.value
                  ? 'border-[var(--action-primary)] bg-[var(--success-surface)]'
                  : 'border-[var(--border)] bg-[var(--surface-card)] hover:border-[var(--action-primary)] hover:bg-[var(--surface-elevated)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <option.icon className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{option.label}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{option.description}</p>
                </div>
              </div>
              {appearance === option.value && (
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--action-primary)] text-[var(--action-primary-foreground)]">
                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              )}
            </button>
          ))}

          <Button variant="secondary" className="sm:col-span-3" onClick={handleSaveAppearance} disabled={isSaving}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Save Appearance
          </Button>
        </div>
      </Card>

      {/* Notifications Section */}
      <Card padding="md">
        <h2 className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
          <Bell className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
          Notifications
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Configure how you receive event updates</p>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)]">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Announcement Notifications</p>
                <p className="text-xs text-[var(--text-secondary)]">Receive alerts for new announcements and updates</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={notifications.announcements} onChange={e => setNotifications(prev => ({ ...prev, announcements: e.target.checked }))} className="sr-only peer" />
              <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--focus)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--action-primary)]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)]">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Schedule Change Notifications</p>
                <p className="text-xs text-[var(--text-secondary)]">Alerts when event schedule is updated</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={notifications.scheduleChanges} onChange={e => setNotifications(prev => ({ ...prev, scheduleChanges: e.target.checked }))} className="sr-only peer" />
              <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--focus)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--action-primary)]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)]">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Event Reminders</p>
                <p className="text-xs text-[var(--text-secondary)]">Reminders before event sessions start</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={notifications.reminders} onChange={e => setNotifications(prev => ({ ...prev, reminders: e.target.checked }))} className="sr-only peer" />
              <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--focus)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--action-primary)]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)]">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Email Notifications</p>
                <p className="text-xs text-[var(--text-secondary)]">Receive notifications via email (requires backend)</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={notifications.email} onChange={e => setNotifications(prev => ({ ...prev, email: e.target.checked }))} className="sr-only peer" disabled />
              <div className="w-11 h-6 bg-[var(--border)]/50 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--focus)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--action-primary)] opacity-50 cursor-not-allowed"></div>
            </label>
          </div>

          <p className="text-xs text-[var(--text-muted)]">Email notifications require backend integration. This is a frontend-only demo setting.</p>

          <Button variant="secondary" onClick={handleSaveNotifications}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Save Notification Preferences
          </Button>
        </div>
      </Card>

      {/* Account & Privacy Section */}
      <Card padding="md">
        <h2 className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
          <ShieldCheck className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
          Account & Privacy
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Manage your account settings and privacy preferences</p>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Account Email</dt>
            <dd className="mt-1 text-sm font-medium text-[var(--text-primary)] break-all">{session?.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Account Role</dt>
            <dd className="mt-1 flex items-center gap-2 text-sm text-[var(--text-primary)]"><Badge variant="secondary" className="text-xs">Participant</Badge></dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Account Status</dt>
            <dd className="mt-1 flex items-center gap-2 text-sm text-[var(--text-primary)]"><Badge variant="success" className="text-xs">Active</Badge></dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Demo Mode</dt>
            <dd className="mt-1 text-sm text-[var(--text-primary)]">{session?.isDemo ? 'Yes (demo account)' : 'No'}</dd>
          </div>
        </dl>

        <div className="mt-6 pt-4 border-t border-[var(--divider)]">
          <h3 className="font-medium text-[var(--text-primary)]">Account Actions</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Sign out of your participant account</p>
          <div className="mt-4 flex gap-2">
            <Button variant="danger" onClick={handleLogout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign Out
            </Button>
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">Account deletion is not available in demo mode. Contact your event organizer for account management.</p>
        </div>
      </Card>

      {/* Data & Privacy Notice */}
      <Card padding="md" className="border-[var(--accent)]/40 bg-[var(--accent-muted)]/50">
        <h2 className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
          <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          Data & Privacy Notice
        </h2>
        <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
          <p>This is a demo application. All data is stored locally in your browser and is not transmitted to any server.</p>
          <p>Settings marked as "demo mode" are session-only and will reset when you clear browser data or sign out.</p>
          <p>No personal data is collected, shared, or used for any purpose beyond this prototype.</p>
          <p className="font-medium">For production use, proper backend authentication, data encryption, and privacy controls would be implemented.</p>
        </div>
      </Card>
    </div>
  );
}