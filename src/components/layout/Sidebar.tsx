'use client';

import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  HeartPulse, 
  Lightbulb, 
  CheckSquare, 
  Handshake, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { ROLE_LABELS } from '@/lib/demo-data';
import { Role } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'event-health', label: 'Event Health', icon: HeartPulse },
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'partners', label: 'Partners', icon: Handshake },
  { id: 'operations', label: 'Operations', icon: Settings },
] as const;

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { selectedView, setSelectedView, selectedRole, setSelectedRole } = useDashboardStore();

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: isOpen ? 280 : 72, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="fixed left-0 top-0 z-40 h-full bg-slate-950 border-r border-slate-800 flex flex-col overflow-hidden"
        style={{ width: isOpen ? 280 : 72 }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3 min-w-0"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-slate-950" />
            </div>
            {isOpen && (
              <span className="font-bold text-lg text-slate-100 whitespace-nowrap truncate">
                EventPilot AI
              </span>
            )}
          </motion.div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="text-slate-400 hover:text-slate-100"
          >
            {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" role="navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = selectedView === item.id;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: isOpen ? 0 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: isOpen ? 0.05 : 0 }}
                onClick={() => setSelectedView(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-colors duration-150
                  ${isActive 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }
                  ${!isOpen ? 'justify-center' : ''}
                `}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {isOpen && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </motion.button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="mb-3">
            {isOpen && (
              <label htmlFor="role-select" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                Team Role
              </label>
            )}
            <Select
              id="role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as Role)}
              options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
              className="w-full"
              aria-label="Select team role"
            />
          </div>

          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-slate-950" />
                </div>
                <span className="font-medium text-slate-100">{ROLE_LABELS[selectedRole]}</span>
              </div>
              <p className="text-xs text-slate-400">
                Viewing dashboard filtered for {ROLE_LABELS[selectedRole].toLowerCase()} team
              </p>
            </motion.div>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}