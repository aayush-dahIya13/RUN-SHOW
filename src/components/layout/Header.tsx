'use client';

import { useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { ArrowLeft, Bell, Menu, Plus, UserRound, User, LogOut, ChevronDown } from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { useDemoSession } from '@/lib/demo-auth';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  title: string;
  onCreateEvent: () => void;
  onBackToDashboard: () => void;
  onOpenSidebar: () => void;
  sidebarOpen: boolean;
}

export function Header({ title, onCreateEvent, onBackToDashboard, onOpenSidebar, sidebarOpen }: HeaderProps) {
  const notifications = useDashboardStore(state => state.notifications);
  const markNotificationRead = useDashboardStore(state => state.markNotificationRead);
  const session = useDemoSession();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = notifications.filter(notification => !notification.read).length;
  const start = parseISO(event.startDate || event.date);
  const end = parseISO(event.endDate || event.startDate || event.date);
  const dateSummary = !isValid(start) ? 'Dates not set' : isValid(end) && format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd')
    ? `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
    : format(start, 'MMM d, yyyy');
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      organizer: 'Organizer',
      'sub-organizer': 'Sub-organizer',
      participant: 'Participant',
      leadership: 'Leadership',
      marketing: 'Marketing',
      partnerships: 'Partnerships',
      operations: 'Operations',
      programme: 'Programme',
    };
    return labels[role] || role;
  };

  return (
    <header className="z-20 shrink-0 border-b border-[var(--divider)] bg-[var(--page-bg)]">
      <div className="flex min-h-20 flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            id="main-navigation-trigger"
            aria-controls="main-sidebar"
            aria-expanded={sidebarOpen}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] md:hidden"
            onClick={onOpenSidebar}
            aria-label="Open main navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h1 className="runshow-scroll-heading truncate text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          {title === 'Dashboard' && (
            <Button type="button" size="sm" onClick={onCreateEvent}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Create Event</span>
            </Button>
          )}
          {title === 'Create Event' && (
            <Button type="button" variant="secondary" size="sm" onClick={onBackToDashboard}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Back to Dashboard</span>
            </Button>
          )}

          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="relative h-10 w-10 p-0"
              onClick={() => setNotificationsOpen(open => !open)}
              aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              aria-expanded={notificationsOpen}
              aria-haspopup="menu"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-xs font-semibold text-[var(--accent-foreground)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            {notificationsOpen && notifications.length > 0 && (
              <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-2 shadow-xl shadow-[var(--shadow-color)] sm:w-80" role="menu" aria-label="Notifications">
                <div className="flex items-center justify-between border-b border-[var(--divider)] px-3 py-2">
                  <h2 className="font-semibold text-[var(--text-primary)]">Notifications</h2>
                  {unreadCount > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => notifications.forEach(notification => markNotificationRead(notification.id))}>
                      Mark all read
                    </Button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {notifications.slice(0, 5).map(notification => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markNotificationRead(notification.id)}
                      className="w-full rounded-md px-3 py-3 text-left hover:bg-[var(--neutral-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                      role="menuitem"
                    >
                      <span className="flex items-start gap-2">
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-[var(--text-secondary)]' : 'bg-[var(--accent)]'}`} />
                        <span className="text-sm text-[var(--text-primary)]">{notification.message}</span>
                      </span>
                      <span className="mt-1 block pl-4 text-xs text-[var(--text-secondary)]">
                        {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
                {notifications.length > 5 && <p className="px-3 py-2 text-center text-sm text-[var(--text-secondary)]">{notifications.length} total notifications</p>}
              </div>
            )}
          </div>

          <ThemeToggle />
          <div className="hidden min-w-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 py-2 sm:flex">
            <UserRound className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
            <span className="max-w-32 truncate text-sm font-medium text-[var(--text-secondary)]">{session?.name ?? 'Organizer'}</span>
            </div>

            {/* User Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg"
                aria-expanded={showUserMenu}
                aria-haspopup="true"
              >
                <User className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <span className="text-sm text-slate-300 font-medium">
                  {user ? getRoleLabel(user.role) : 'Organizer'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
              </Button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-2"
                    role="menu"
                  >
                    {user && (
                      <div className="px-3 py-2 border-b border-slate-800">
                        <p className="text-sm font-medium text-slate-100 truncate">{user.email}</p>
                        <p className="text-xs text-slate-400 capitalize">{getRoleLabel(user.role)}</p>
                        {user.teamResponsibility && (
                          <p className="text-xs text-cyan-400 mt-1">{user.teamResponsibility}</p>
                        )}
                      </div>
                    )}
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-800/50 transition-colors"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>
  );
}
