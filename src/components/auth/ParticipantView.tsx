'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Star, 
  TicketCheck,
  Heart,
  Share2,
  Clock,
  Info
} from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { DEMO_EVENT } from '@/lib/demo-data';

export function ParticipantView() {
  const { event } = useDashboardStore();
  const { logout } = useAuthStore();
  const [selectedView, setSelectedView] = useState<'overview' | 'schedule' | 'venue' | 'network'>('overview');
  const [currentTime] = useState(() => Date.now());

  const eventDate = new Date(event.date);
  const daysRemaining = Math.max(0, Math.ceil((eventDate.getTime() - currentTime) / (1000 * 60 * 60 * 24)));

  const participantViews = [
    { id: 'overview', label: 'Overview', icon: Info, description: 'Event summary and key details' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, description: 'Sessions, speakers, and agenda' },
    { id: 'venue', label: 'Venue', icon: MapPin, description: 'Location, travel, and accommodation' },
    { id: 'network', label: 'Network', icon: Users, description: 'Attendees, connections, messaging' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Participant Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                <TicketCheck className="w-6 h-6 text-slate-950" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100">{event.name}</h1>
                <p className="text-sm text-slate-400">Participant View</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg">
                <Users className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <span className="text-sm text-slate-300 font-medium">Participant</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 hover:text-slate-200">
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Event Countdown Bar */}
        <div className="mt-4 p-4 bg-slate-900/50 border border-slate-800/50 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                <span>{eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                <span>{event.venue || 'Venue TBD'}</span>
              </div>
            </div>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-3 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-cyan-400 tabular-nums">{daysRemaining}</p>
                <p className="text-xs text-slate-500">Days Remaining</p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8" role="main">
        {/* Navigation Tabs */}
        <motion.nav
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
          role="navigation"
          aria-label="Participant views"
        >
          <div className="flex flex-wrap gap-2 bg-slate-900/50 border border-slate-800/50 rounded-xl p-1">
            {participantViews.map((view) => {
              const Icon = view.icon;
              const isActive = selectedView === view.id;
              return (
                <button
                  key={view.id}
                  onClick={() => setSelectedView(view.id as 'overview' | 'schedule' | 'venue' | 'network')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span>{view.label}</span>
                </button>
              );
            })}
          </div>
        </motion.nav>

        {/* View Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {selectedView === 'overview' && <OverviewView event={event} daysRemaining={daysRemaining} />}
            {selectedView === 'schedule' && <ScheduleView />}
            {selectedView === 'venue' && <VenueView event={event} />}
            {selectedView === 'network' && <NetworkView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function OverviewView({ event, daysRemaining }: { event: typeof DEMO_EVENT; daysRemaining: number }) {
  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card variant="glass" padding="lg" className="border-slate-800/50">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
              <Heart className="w-5 h-5 text-slate-950" aria-hidden="true" />
            </span>
            Welcome to {event.name}!
          </CardTitle>
          <CardDescription>Your personalized event experience starts here</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-300 leading-relaxed">
            We&apos;re excited to have you join us for this event. Use the tabs above to explore the schedule, 
            venue information, and connect with other attendees.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              icon={<Calendar className="w-5 h-5" />} 
              label="Event Date" 
              value={new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
              color="cyan"
            />
            <StatCard 
              icon={<Clock className="w-5 h-5" />} 
              label="Days Left" 
              value={daysRemaining.toString()} 
              color="green"
            />
            <StatCard 
              icon={<Users className="w-5 h-5" />} 
              label="Expected Attendees" 
              value={event.targetRegistrations.toLocaleString()} 
              color="purple"
            />
            <StatCard 
              icon={<MapPin className="w-5 h-5" />} 
              label="Format" 
              value={event.format?.replace('-', ' ') || 'TBD'} 
              color="orange"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard 
          icon={<TicketCheck className="w-5 h-5" />} 
          title="My Ticket" 
          description="View and manage your registration"
          actionLabel="View Ticket"
          color="cyan"
        />
        <QuickActionCard 
          icon={<Calendar className="w-5 h-5" />} 
          title="My Schedule" 
          description="Build your personal agenda"
          actionLabel="Open Schedule"
          color="green"
        />
        <QuickActionCard 
          icon={<Users className="w-5 h-5" />} 
          title="Attendees" 
          description="See who else is attending"
          actionLabel="Browse"
          color="purple"
        />
        <QuickActionCard 
          icon={<Share2 className="w-5 h-5" />} 
          title="Invite Others" 
          description="Share the event with colleagues"
          actionLabel="Share Event"
          color="orange"
        />
      </div>

      {/* Event Highlights */}
      <Card variant="glass" padding="lg" className="border-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" aria-hidden="true" />
            Event Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              'Keynote sessions from industry leaders',
              'Hands-on workshops and breakout sessions',
              'Networking breaks and social events',
              'Partner exhibition and demo zone',
              'Live Q&A with speakers',
            ].map((highlight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.3 }}
                className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-yellow-400" aria-hidden="true" />
                </div>
                <span className="text-slate-300">{highlight}</span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScheduleView() {
  return (
    <div className="space-y-6">
      <Card variant="glass" padding="lg" className="border-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" aria-hidden="true" />
            Event Schedule
          </CardTitle>
          <CardDescription>Build your personal agenda by adding sessions to your schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { time: '09:00 - 10:00', title: 'Opening Keynote: The Future of Events', speaker: 'Sarah Chen, CEO EventTech', type: 'keynote', location: 'Main Hall' },
              { time: '10:15 - 11:15', title: 'Workshop: AI in Event Planning', speaker: 'Dr. Alex Rivera', type: 'workshop', location: 'Room A' },
              { time: '11:30 - 12:30', title: 'Panel: Sustainable Event Practices', speaker: 'Moderated by Jamie Park', type: 'panel', location: 'Main Hall' },
              { time: '12:30 - 14:00', title: 'Networking Lunch', speaker: '', type: 'break', location: 'Atrium' },
              { time: '14:00 - 15:00', title: 'Breakout: Marketing Automation', speaker: 'Morgan Kim', type: 'breakout', location: 'Room B' },
              { time: '15:15 - 16:15', title: 'Closing Remarks & Awards', speaker: 'Event Team', type: 'keynote', location: 'Main Hall' },
            ].map((session, i) => (
              <SessionCard key={i} session={session} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VenueView({ event }: { event: typeof DEMO_EVENT }) {
  return (
    <div className="space-y-6">
      <Card variant="glass" padding="lg" className="border-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" aria-hidden="true" />
            Venue Information
          </CardTitle>
          <CardDescription>Everything you need to know about getting to and navigating the venue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                Location
              </h3>
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800/50">
                <p className="font-medium text-slate-100">{event.venue || 'Venue to be announced'}</p>
                <p className="text-slate-400 text-sm mt-1">Address will be confirmed closer to the event date</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                Date & Time
              </h3>
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800/50 space-y-2">
                <div className="flex items-center gap-3 text-slate-300">
                  <Calendar className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                  <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Clock className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                  <span>09:00 AM - 06:00 PM (local time)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoCard icon={<Heart className="w-5 h-5" />} title="Accommodation" description="Partner hotels with special rates available. Book early for best availability." color="cyan" />
            <InfoCard icon={<Users className="w-5 h-5" />} title="Transportation" description="Shuttle service from partner hotels. Public transit and rideshare drop-off zones available." color="green" />
            <InfoCard icon={<Info className="w-5 h-5" />} title="Accessibility" description="Wheelchair accessible venue. Sign language interpretation available upon request." color="purple" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NetworkView() {
  return (
    <div className="space-y-6">
      <Card variant="glass" padding="lg" className="border-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" aria-hidden="true" />
            Attendee Network
          </CardTitle>
          <CardDescription>Connect with other participants before, during, and after the event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <Button variant="primary" size="sm">
              <Users className="w-4 h-4" aria-hidden="true" />
              Browse Attendees
            </Button>
            <Button variant="secondary" size="sm">
              <Share2 className="w-4 h-4" aria-hidden="true" />
              My Connections
            </Button>
            <Button variant="ghost" size="sm">
              <Star className="w-4 h-4" aria-hidden="true" />
              Recommended
            </Button>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Alex Thompson', role: 'Product Manager', company: 'TechCorp', interests: ['AI', 'Events', 'Product'] },
              { name: 'Maria Garcia', role: 'Marketing Director', company: 'GrowthLab', interests: ['Marketing', 'Growth', 'Analytics'] },
              { name: 'James Wilson', role: 'CTO', company: 'StartupXYZ', interests: ['Engineering', 'Leadership', 'Scale'] },
              { name: 'Priya Patel', role: 'Event Producer', company: 'CreativeEvents', interests: ['Production', 'Design', 'Experience'] },
            ].map((attendee, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.2 }}
                className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800/50"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold">
                  {attendee.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-100 truncate">{attendee.name}</p>
                  <p className="text-sm text-slate-400 truncate">{attendee.role} at {attendee.company}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {attendee.interests.map((interest, j) => (
                      <span key={j} className="px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-cyan-400">
                  Connect
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[color as keyof typeof colors]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}500/10` }}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function QuickActionCard({ icon, title, description, actionLabel, color }: { icon: React.ReactNode; title: string; description: string; actionLabel: string; color: string }) {
  const colors = {
    cyan: 'hover:border-cyan-500/30',
    green: 'hover:border-green-500/30',
    purple: 'hover:border-purple-500/30',
    orange: 'hover:border-orange-500/30',
  };

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-xl border border-slate-800/50 bg-slate-900/30 text-left transition-all duration-200 ${colors[color as keyof typeof colors]}`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3`} style={{ backgroundColor: `${color}500/10` }}>
        {icon}
      </div>
      <h3 className="font-medium text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-3">{description}</p>
      <span className="text-sm font-medium" style={{ color: `${color}400` }}>{actionLabel} →</span>
    </motion.button>
  );
}

function SessionCard({ session }: { session: { time: string; title: string; speaker: string; type: string; location: string } }) {
  const typeColors = {
    keynote: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    workshop: 'bg-green-500/10 text-green-400 border-green-500/20',
    panel: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    breakout: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    break: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  return (
    <div className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800/50">
      <div className="flex-shrink-0 w-20 text-right text-sm font-mono text-slate-400">
        {session.time}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-slate-100">{session.title}</h4>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${typeColors[session.type as keyof typeof typeColors]}`}>
            {session.type}
          </span>
        </div>
        {session.speaker && (
          <p className="text-sm text-slate-400 mb-1">{session.speaker}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{session.location}</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-cyan-400">
        Add
      </Button>
    </div>
  );
}

function InfoCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  const colors = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[color as keyof typeof colors]}`}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${color}500/10` }}>
        {icon}
      </div>
      <h4 className="font-medium text-slate-100 mb-1">{title}</h4>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}
