'use client';

import { CalendarDays, CheckSquare, HeartPulse, LayoutDashboard, RadioTower, Settings, X } from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { ROLE_LABELS } from '@/lib/demo-data';
import { Role } from '@/lib/types';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { Select } from '@/components/ui/Input';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'event-health', label: 'Event Health', icon: HeartPulse },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { selectedView, setSelectedView, selectedRole, setSelectedRole } = useDashboardStore();

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[var(--metallic-black)]/45 md:hidden"
          onClick={onClose}
          aria-label="Close main navigation"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-64 min-h-0 shrink-0 flex-col border-r border-[var(--divider)] bg-[var(--sidebar-bg)] transition-transform duration-200 md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Main navigation"
      >
        <div className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-[var(--divider)] px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--action-primary)] text-[var(--action-primary-foreground)]">
              <RadioTower className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-lg font-bold leading-tight text-[var(--text-primary)]">RUNSHOW</span>
              <span className="block truncate text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Intelligent Event Command Centre</span>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] md:hidden"
            onClick={onClose}
            aria-label="Close main navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Organizer navigation">
          <ul className="space-y-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = selectedView === item.id || (selectedView === 'setup' && item.id === 'overview');

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedView(item.id);
                      onClose();
                    }}
                    className={`group flex min-h-11 w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left font-medium transition-[background-color,color,border-color] duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--focus)] ${isActive
                      ? 'border-l-[var(--accent)] bg-[var(--action-primary)] text-[var(--action-primary-foreground)]'
                      : 'border-l-transparent text-[var(--text-secondary)] hover:border-l-[var(--action-primary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--action-primary)]'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.label}
                  >
                    <Icon className="h-5 w-5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 space-y-3 border-t border-[var(--divider)] p-3">
          <label htmlFor="role-select" className="block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Team view
          </label>
          <Select
            id="role-select"
            value={selectedRole}
            onChange={event => setSelectedRole(event.target.value as Role)}
            options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
            className="w-full"
            aria-label="Filter organizer workspace by team role"
          />
          <div className="border-t border-[var(--divider)] pt-3">
            <LogoutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
