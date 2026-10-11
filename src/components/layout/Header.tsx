'use client';

import { motion } from 'motion/react';
import { Bell, User } from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { DEMO_EVENT } from '@/lib/demo-data';
import { Button } from '@/components/ui/Button';
import { EventCountdown, EventDateDisplay } from './EventCountdown';

export function Header() {
  const { notifications, markNotificationRead } = useDashboardStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800"
      role="banner"
    >
      <div className="max-w-full mx-auto px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{DEMO_EVENT.name}</h1>
              <EventDateDisplay />
            </div>
            <EventCountdown />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Button variant="ghost" size="sm" className="relative p-2">
                <Bell className="w-5 h-5 text-slate-400" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              {notifications.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-2"
                  role="menu"
                >
                  <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-100">Notifications</h3>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => notifications.forEach(n => markNotificationRead(n.id))}>
                        Mark all read
                      </Button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {notifications.slice(0, 5).map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => markNotificationRead(notif.id)}
                        className={`w-full px-3 py-3 rounded-lg text-left hover:bg-slate-800/50 transition-colors ${
                          !notif.read ? 'bg-slate-800/50' : ''
                        }`}
                        role="menuitem"
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${!notif.read ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                          <p className="text-sm text-slate-300">{notif.message}</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </button>
                    ))}
                  </div>
                  {notifications.length > 5 && (
                    <div className="px-3 py-2 border-t border-slate-800 text-center">
                      <span className="text-sm text-slate-500">{notifications.length} total notifications</span>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg">
              <User className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <span className="text-sm text-slate-300 font-medium">Organizer</span>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}