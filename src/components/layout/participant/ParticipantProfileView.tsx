'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, CalendarDays, TicketCheck, ShieldCheck, RadioTower, Save, X, Edit2, Loader2, CheckCircle, AlertCircle, LogOut, Bell } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { useDemoSession } from '@/lib/demo-auth';
import { useDashboardStore } from '@/lib/dashboard-state';
import { useAuthStore } from '@/lib/auth-store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

export function ParticipantProfileView() {
  const session = useDemoSession();
  const { events, participantEvents } = useDashboardStore();
  const { user, logout } = useAuthStore();
  const links = participantEvents.filter(link => link.accountId === session?.id);
  const myEvents = links.map(link => ({ link, event: events.find(item => item.id === link.eventId) })).filter((item): item is { link: typeof links[number]; event: NonNullable<typeof item.event> } => !!item.event);

  // Editable profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    fullName: session?.name || '',
    phone: '',
    preferredContact: 'email',
    notifications: true,
    scheduleChanges: true,
    reminders: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setEditData(prev => ({
        ...prev,
        fullName: user.email.split('@')[0], // Default from email
      }));
    }
  }, [user, session]);

  const upcomingEvents = myEvents.filter(item => {
    const eventDate = item.event.startDate || item.event.date;
    const parsed = parseISO(eventDate);
    return isValid(parsed) && parsed >= new Date();
  });

  const pastEvents = myEvents.filter(item => {
    const eventDate = item.event.startDate || item.event.date;
    const parsed = parseISO(eventDate);
    return isValid(parsed) && parsed < new Date();
  });

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setIsSaving(true);

    // Simulate save - in real app would call API
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update local storage via auth store if needed
    setIsSaving(false);
    setSuccess('Profile updated successfully (demo mode - changes are session-only)');
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      fullName: session?.name || '',
      phone: '',
      preferredContact: 'email',
      notifications: true,
      scheduleChanges: true,
      reminders: true,
    });
    setError('');
    setSuccess('');
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)]">Personal Information</h2>
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" aria-hidden="true" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} loading={isSaving}>
                <Save className="h-4 w-4" aria-hidden="true" />
                Save
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4" aria-hidden="true" />
              Edit Profile
            </Button>
          )}
        </div>

        {error && <div className="mt-4 p-3 rounded-lg bg-[var(--danger-surface)] border border-[var(--accent)] text-sm text-[var(--danger)]" role="alert">{error}</div>}
        {success && <div className="mt-4 p-3 rounded-lg bg-[var(--success-surface)] border border-[var(--action-primary)] text-sm text-[var(--action-primary)] flex items-center gap-2" role="status"><CheckCircle className="h-4 w-4" aria-hidden="true" />{success}</div>}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Full Name</label>
            {isEditing ? (
              <Input value={editData.fullName} onChange={e => setEditData(prev => ({ ...prev, fullName: e.target.value }))} placeholder="Your full name" />
            ) : (
              <p className="text-sm font-medium text-[var(--text-primary)]">{session?.name || 'Not provided'}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Email Address</label>
            <p className="text-sm font-medium text-[var(--text-primary)] break-all">{session?.email || 'Not provided'}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Phone Number</label>
            {isEditing ? (
              <Input type="tel" value={editData.phone} onChange={e => setEditData(prev => ({ ...prev, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">Not provided</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Preferred Contact</label>
            {isEditing ? (
              <select value={editData.preferredContact} onChange={e => setEditData(prev => ({ ...prev, preferredContact: e.target.value }))} className="w-full px-3 py-2 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] focus:border-[var(--action-primary)] appearance-auto pr-10">
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="both">Both</option>
              </select>
            ) : (
              <p className="text-sm text-[var(--text-primary)] capitalize">{editData.preferredContact}</p>
            )}
          </div>
        </div>

        {/* Avatar placeholder */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--action-primary-fill)] text-[var(--action-primary-foreground)] text-2xl font-bold">
            {session?.name?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{session?.name || 'Participant'}</p>
            <p className="text-xs text-[var(--text-secondary)]">Profile image not yet supported</p>
          </div>
        </div>
      </Card>

      {/* Participation Information */}
      <Card padding="md">
        <h2 className="font-semibold text-[var(--text-primary)]">Participation Information</h2>

        {/* Upcoming Events */}
        <div className="mt-4">
          <h3 className="font-medium text-[var(--text-primary)]">Upcoming Events ({upcomingEvents.length})</h3>
          {upcomingEvents.length > 0 ? (
            <div className="mt-3 space-y-2">
              {upcomingEvents.map(item => (
                <div key={item.event.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--action-primary-fill)] text-[var(--action-primary-foreground)]"><CalendarDays className="h-5 w-5" aria-hidden="true" /></div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{item.event.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{format(parseISO(item.event.startDate || item.event.date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-xs">{registrationStatusLabel(item.link.registrationStatus)}</Badge>
                    <p className="mt-1 text-xs text-[var(--text-muted)] font-mono">Ref: {item.event.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">No upcoming events</p>
          )}
        </div>

        {/* Past Events */}
        <div className="mt-6">
          <h3 className="font-medium text-[var(--text-primary)]">Completed Events ({pastEvents.length})</h3>
          {pastEvents.length > 0 ? (
            <div className="mt-3 space-y-2">
              {pastEvents.map(item => (
                <div key={item.event.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] opacity-75">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-elevated)] text-[var(--text-secondary)]"><TicketCheck className="h-5 w-5" aria-hidden="true" /></div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{item.event.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{format(parseISO(item.event.startDate || item.event.date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-xs">{registrationStatusLabel(item.link.registrationStatus)}</Badge>
                    <p className="mt-1 text-xs text-[var(--text-muted)] font-mono">Ref: {item.event.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">No completed events</p>
          )}
        </div>

        {/* Registration Summary */}
        <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-sm font-medium text-[var(--text-primary)]">Registration Summary</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--action-primary)]">{myEvents.length}</p>
              <p className="text-xs text-[var(--text-secondary)]">Total Events</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--action-primary)]">{upcomingEvents.length}</p>
              <p className="text-xs text-[var(--text-secondary)]">Upcoming</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--action-primary)]">{pastEvents.length}</p>
              <p className="text-xs text-[var(--text-secondary)]">Completed</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Preferences & Account */}
      <Card padding="md">
        <h2 className="font-semibold text-[var(--text-primary)]">Preferences & Account</h2>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)]">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Announcement Notifications</p>
                <p className="text-xs text-[var(--text-secondary)]">Receive alerts for new announcements</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={editData.notifications} className="sr-only peer" />
              <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--focus)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--action-primary)]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)]">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Schedule Change Notifications</p>
                <p className="text-xs text-[var(--text-secondary)]">Alerts for schedule updates</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={editData.scheduleChanges} className="sr-only peer" />
              <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--focus)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--action-primary)]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)]">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Event Reminders</p>
                <p className="text-xs text-[var(--text-secondary)]">Reminders before event sessions</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={editData.reminders} className="sr-only peer" />
              <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--focus)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--action-primary)]"></div>
            </label>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--divider)]">
          <h3 className="font-medium text-[var(--text-primary)]">Account Details</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--text-secondary)]">Account Role</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-[var(--text-primary)]"><Badge variant="secondary" className="text-xs">Participant</Badge></dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-secondary)]">Account Status</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-[var(--text-primary)]"><Badge variant="success" className="text-xs">Active</Badge></dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-secondary)]">Theme Preference</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">System default (managed in Settings)</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-secondary)]">Demo Mode</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">{session?.isDemo ? 'Yes' : 'No'}</dd>
            </div>
          </dl>

          <div className="mt-4">
            <Button variant="danger" onClick={logout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign Out
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function registrationStatusLabel(status?: 'invited' | 'registered' | 'cancelled') {
  if (!status) return 'Not registered';
  return status === 'registered' ? 'Registered' : status === 'invited' ? 'Invitation only' : 'Cancelled';
}