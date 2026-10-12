'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle, Mail, CalendarDays, TicketCheck, ShieldCheck, MessageSquare, X, ChevronDown, ChevronUp, HelpCircle, Loader, Bot, Zap, MapPin, MessageCircle } from 'lucide-react';
import { useDemoSession } from '@/lib/demo-auth';
import { useDashboardStore } from '@/lib/dashboard-state';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Input';

interface SupportTicket {
  id: string;
  eventId: string;
  eventName: string;
  participantId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  referenceNumber: string;
}

interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: 'participant' | 'organizer' | 'sub_organizer' | 'system';
  content: string;
  isInternal: boolean;
  createdAt: string;
  attachments: string[];
}

interface Event {
  id: string;
  name: string;
}

const CATEGORIES = [
  { value: 'registration', label: 'Registration / Invitation Issue', icon: Mail },
  { value: 'payment', label: 'Payment / Ticket Issue', icon: TicketCheck },
  { value: 'schedule', label: 'Schedule / Venue Problem', icon: CalendarDays },
  { value: 'checkin', label: 'Check-in / Access Problem', icon: ShieldCheck },
  { value: 'technical', label: 'Technical Portal Issue', icon: Bot },
  { value: 'communication', label: 'Organizer Communication', icon: MessageSquare },
  { value: 'other', label: 'Other', icon: HelpCircle },
] as const;

const FAQ_DATA = [
  { question: 'How do I register for an event?', answer: 'Go to Explore Events, find the event you want, and click Register. For private events, use the Join with Invitation feature.', category: 'registration', icon: Mail },
  { question: 'I haven\'t received my confirmation email', answer: 'Check your spam folder. Confirmations are sent immediately after registration. If still missing, contact support.', category: 'registration', icon: Mail },
  { question: 'How do I use an invitation code?', answer: 'Go to Join with Invitation, enter the code, and click Validate. If valid, you can join the event.', category: 'registration', icon: Mail },
  { question: 'My invitation code doesn\'t work', answer: 'The code may have expired, been revoked, or reached its usage limit. Contact the event organizer for a new code.', category: 'registration', icon: AlertCircle },
  { question: 'Payment failed but I was charged', answer: 'Payment processing is demo-only in this prototype. No actual charges occur. Contact support if you see a real charge.', category: 'payment', icon: TicketCheck },
  { question: 'Can I get a refund?', answer: 'Refunds follow the event\'s cancellation policy. Check the event details or contact the organizer.', category: 'payment', icon: TicketCheck },
  { question: 'The schedule changed after I registered', answer: 'Check Announcements for updates. Organizers should notify participants of changes. If not notified, report it.', category: 'schedule', icon: CalendarDays },
  { question: 'Venue is different from what was advertised', answer: 'Report this as a venue problem. Organizers should communicate venue changes.', category: 'schedule', icon: MapPin },
  { question: 'I can\'t check in at the event', answer: 'Ensure you have your registration reference. Staff can look you up by name/email. Report access issues immediately.', category: 'checkin', icon: ShieldCheck },
  { question: 'The portal is not loading properly', answer: 'Try refreshing, clearing cache, or using a different browser. If persistent, report with details.', category: 'technical', icon: Bot },
  { question: 'How do I contact the organizer?', answer: 'Use Report a Problem to create a support ticket. Organizers will be notified and can respond through the portal.', category: 'communication', icon: MessageSquare },
] as const;

export function SupportCentreView() {
  const session = useDemoSession();
  const { events, participantEvents } = useDashboardStore();
  const links = participantEvents.filter(link => link.accountId === session?.id);
  const myEvents = links.map(link => ({ link, event: events.find(item => item.id === link.eventId) })).filter((item): item is { link: typeof links[number]; event: NonNullable<typeof item.event> } => !!item.event);

  const [activeTab, setActiveTab] = useState<'assistant' | 'tickets' | 'new'>('assistant');
  const [query, setQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({
    eventId: '',
    category: 'registration',
    title: '',
    description: '',
    priority: 'normal',
  });
  const [creating, setCreating] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<Array<{ role: 'assistant' | 'user'; content: string; links?: string[] }>>([]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantEventContext, setAssistantEventContext] = useState<string>('');
  const [showEventContextPicker, setShowEventContextPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTickets();
    setAssistantMessages([{
      role: 'assistant',
      content: "Hi! I'm your RUNSHOW support assistant. I can help with event questions, registration issues, and more. Select an event from the dropdown or ask me anything!",
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assistantMessages, messages]);

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch('/api/support/tickets', { headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, { headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setActiveTicket(data);
      }
    } catch {
      // Ignore
    }
  };

  const handleAssistantQuery = async () => {
    if (!query.trim()) return;
    const userQuery = query;
    setQuery('');
    setAssistantLoading(true);

    setAssistantMessages(prev => [...prev, { role: 'user', content: userQuery }]);

    const lowerQuery = userQuery.toLowerCase();
    let answer = '';
    let links: string[] = [];

    for (const faq of FAQ_DATA) {
      const keywords = faq.question.toLowerCase().split(' ').filter(w => w.length > 3);
      if (keywords.some(k => lowerQuery.includes(k))) {
        answer = faq.answer;
        break;
      }
    }

    if (!answer && selectedEventId) {
      const event = myEvents.find(e => e.event.id === selectedEventId);
      if (event) {
        if (lowerQuery.includes('schedule') || lowerQuery.includes('time')) {
          answer = `The schedule for ${event.event.name} is available in the Schedule tab.`;
          links = ['schedule'];
        } else if (lowerQuery.includes('venue') || lowerQuery.includes('location')) {
          answer = `Venue for ${event.event.name}: ${event.event.venue || 'Venue details pending'}. Check Venue & Details for more info.`;
          links = ['venue'];
        } else if (lowerQuery.includes('register') || lowerQuery.includes('registration')) {
          const reg = event.link.registrationStatus;
          answer = `Your registration status for ${event.event.name}: ${reg || 'Not registered'}.`;
          links = ['events'];
        } else if (lowerQuery.includes('announcement') || lowerQuery.includes('update')) {
          answer = `Check the Announcements tab for updates on ${event.event.name}.`;
          links = ['announcements'];
        }
      }
    }

    if (!answer) {
      answer = "I'm not sure about that. Try asking about schedules, venues, registration, or select an event from the dropdown for event-specific help. You can also create a support ticket if you need organizer assistance.";
    }

    setAssistantMessages(prev => [...prev, { role: 'assistant', content: answer, links }]);
    setAssistantLoading(false);
  };

  const handleCreateTicket = async () => {
    if (!newTicket.eventId || !newTicket.title || !newTicket.description || !newTicket.category) return;
    setCreating(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicket),
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      const ticket = await res.json();
      setShowNewTicket(false);
      setNewTicket({ eventId: '', category: 'registration', title: '', description: '', priority: 'normal' });
      setActiveTab('tickets');
      fetchTickets();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !activeTicket) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${activeTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply, isInternal: false }),
      });
      if (!res.ok) throw new Error('Failed to send reply');
      setReply('');
      fetchTicketMessages(activeTicket.id);
      fetchTickets();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setQuery(action);
    handleAssistantQuery();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Help & Support</h1>
          <p className="text-sm text-[var(--text-secondary)]">Get answers, report issues, and track your requests</p>
        </div>
        <Button onClick={() => { setShowNewTicket(true); setActiveTab('new'); }} variant="secondary">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Report a Problem
        </Button>
      </div>

      <div className="flex" role="tablist">
        <button role="tab" aria-selected={activeTab === 'assistant'} onClick={() => setActiveTab('assistant')} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'assistant' ? 'border-b-2 border-[var(--action-primary)] text-[var(--action-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
          <Bot className="inline h-4 w-4 mr-2" aria-hidden="true" /> Assistant
        </button>
        <button role="tab" aria-selected={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'tickets' ? 'border-b-2 border-[var(--action-primary)] text-[var(--action-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
          <MessageSquare className="inline h-4 w-4 mr-2" aria-hidden="true" /> My Tickets
        </button>
        <button role="tab" aria-selected={activeTab === 'new'} onClick={() => setActiveTab('new')} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'new' ? 'border-b-2 border-[var(--action-primary)] text-[var(--action-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
          <Zap className="inline h-4 w-4 mr-2" aria-hidden="true" /> Report Problem
        </button>
      </div>

      {activeTab === 'assistant' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Card className="flex flex-col h-[calc(100vh-300px)] min-h-[500px]">
            <div className="flex items-center justify-between border-b border-[var(--divider)] px-4 py-3">
              <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Bot className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
                Support Assistant
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={selectedEventId}
                  onChange={e => setSelectedEventId(e.target.value)}
                  className="px-3 py-1.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                >
                  <option value="">General Questions</option>
                  {myEvents.map(item => <option key={item.event.id} value={item.event.id}>{item.event.name}</option>)}
                </select>
                <span className="text-xs text-[var(--text-muted)]">Demo mode: Rule-based responses only</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesEndRef}>
              {assistantMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                    <div className={`rounded-2xl px-4 py-2.5 ${msg.role === 'user' ? 'bg-[var(--action-primary-fill)] text-[var(--action-primary-foreground)] rounded-br-none' : 'bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-bl-none'}`}>
                      <p className="text-sm">{msg.content}</p>
                      {msg.links && msg.links.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {msg.links.map(link => (
                            <Button key={link} variant="ghost" size="sm" onClick={() => { window.dispatchEvent(new CustomEvent('runshow:workspace-tab', { detail: { tab: link } })); }}>
                              Go to {link.charAt(0).toUpperCase() + link.slice(1)}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {assistantLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="bg-[var(--surface-elevated)] rounded-2xl px-4 py-2.5 rounded-bl-none">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-[var(--action-primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-[var(--action-primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-[var(--action-primary)] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-[var(--divider)] p-4">
              <div className="flex gap-2">
                <Input
                  ref={el => { if (el) el.focus(); }}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAssistantQuery())}
                  placeholder="Ask a question..."
                  className="flex-1"
                  disabled={assistantLoading}
                />
                <Button onClick={handleAssistantQuery} disabled={assistantLoading || !query.trim()} loading={assistantLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <p className="text-xs text-[var(--text-muted)]">Quick questions:</p>
                {['Where is my schedule?', 'How do I register?', 'Venue details', 'Check-in help'].map(q => (
                  <Button key={q} variant="ghost" size="sm" onClick={() => handleQuickAction(q)} className="text-xs">{q}</Button>
                ))}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card padding="md">
              <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-[var(--action-primary)]" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start" onClick={() => handleQuickAction('How do I register?')}>
                  <Mail className="h-4 w-4 mr-2" /> Register for an event
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => handleQuickAction('Where is my schedule?')}>
                  <CalendarDays className="h-4 w-4 mr-2" /> View my schedule
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => handleQuickAction('Venue details')}>
                  <MapPin className="h-4 w-4 mr-2" /> Find venue info
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => handleQuickAction('Check-in help')}>
                  <ShieldCheck className="h-4 w-4 mr-2" /> Check-in help
                </Button>
              </div>
            </Card>

            <Card padding="md">
              <h3 className="font-semibold text-[var(--text-primary)] mb-3">Common Topics</h3>
              <div className="space-y-1">
                {FAQ_DATA.slice(0, 8).map(faq => {
                  const Icon = FAQ_DATA.find(f => f.category === faq.category)?.icon;
                  return (
                    <Button key={faq.question} variant="ghost" size="sm" className="w-full justify-start text-left p-2" onClick={() => handleQuickAction(faq.question)}>
                      {Icon && <Icon className="h-3.5 w-3.5 mr-2" />}
                      {faq.question}
                    </Button>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-[var(--text-primary)]">My Support Tickets</h2>
            <Button variant="secondary" onClick={() => { setShowNewTicket(true); setActiveTab('new'); }}>
              <MessageSquare className="h-4 w-4 mr-2" /> New Ticket
            </Button>
          </div>
          {loadingTickets ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-[var(--action-primary)]" /></div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
              <h3 className="mt-3 font-medium text-[var(--text-primary)]">No support tickets yet</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Create a ticket to get help from organizers</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} onClick={() => { fetchTicketMessages(ticket.id); setActiveTab('tickets'); }} />
              ))}
            </div>
          )}

          {activeTicket && (
            <div className="mt-6 border-t border-[var(--divider)] pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--text-primary)]">Ticket #{activeTicket.referenceNumber}</h3>
                <Button variant="ghost" size="sm" onClick={() => { setActiveTicket(null); setMessages([]); }}>Close</Button>
              </div>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {messages.map(msg => (
                  <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === session?.id} />
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendReply())} placeholder="Type a reply..." className="flex-1" disabled={sending} />
                <Button onClick={handleSendReply} disabled={sending || !reply.trim()} loading={sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'new' && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-[var(--text-primary)]">Report a Problem</h2>
            <Button variant="ghost" size="sm" onClick={() => { setShowNewTicket(false); setActiveTab('assistant'); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={e => { e.preventDefault(); handleCreateTicket(); }} className="space-y-4">
            {myEvents.length > 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Related Event *</label>
                  <select value={newTicket.eventId} onChange={e => setNewTicket(prev => ({ ...prev, eventId: e.target.value }))} className="w-full px-3 py-2 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]" required>
                    <option value="">Select an event</option>
                    {myEvents.map(item => <option key={item.event.id} value={item.event.id}>{item.event.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Category *</label>
              <select value={newTicket.category} onChange={e => setNewTicket(prev => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]" required>
                {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}><cat.icon className="h-3.5 w-3.5 mr-2" />{cat.label}</option>)}
              </select>
            </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Priority</label>
                <select value={newTicket.priority} onChange={e => setNewTicket(prev => ({ ...prev, priority: e.target.value }))} className="w-full px-3 py-2 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Title *</label>
                <Input value={newTicket.title} onChange={e => setNewTicket(prev => ({ ...prev, title: e.target.value }))} placeholder="Brief summary of the issue" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description *</label>
                <Textarea value={newTicket.description} onChange={e => setNewTicket(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe the issue in detail..." rows={5} required />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={creating} loading={creating} className="flex-1">
                  Submit Ticket
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setShowNewTicket(false); setActiveTab('assistant'); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}
    </div>
  );
}

interface SupportTicket {
  id: string;
  eventId: string;
  eventName: string;
  participantId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  referenceNumber: string;
}

interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: 'participant' | 'organizer' | 'sub_organizer' | 'system';
  content: string;
  isInternal: boolean;
  createdAt: string;
  attachments: string[];
}

function TicketCard({ ticket, onClick }: { ticket: SupportTicket; onClick: () => void }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    open: { bg: 'bg-[var(--success-surface)]', text: 'text-[var(--action-primary)]' },
    acknowledged: { bg: 'bg-[var(--accent-muted)]', text: 'text-[var(--accent-foreground)]' },
    in_progress: { bg: 'bg-[var(--action-primary-fill)]', text: 'text-[var(--action-primary-foreground)]' },
    waiting_for_participant: { bg: 'bg-[var(--accent-muted)]', text: 'text-[var(--accent-foreground)]' },
    resolved: { bg: 'bg-[var(--success-surface)]', text: 'text-[var(--action-primary)]' },
    closed: { bg: 'bg-[var(--neutral-surface)]', text: 'text-[var(--text-secondary)]' },
  };
  const priorityColors: Record<string, { bg: string; text: string }> = {
    low: { bg: 'bg-[var(--success-surface)]', text: 'text-[var(--action-primary)]' },
    normal: { bg: 'bg-[var(--accent-muted)]', text: 'text-[var(--accent-foreground)]' },
    high: { bg: 'bg-[var(--accent-muted)]', text: 'text-[var(--accent-foreground)]' },
    critical: { bg: 'bg-[var(--danger-surface)]', text: 'text-[var(--danger)]' },
  };

  const statusConfig = statusColors[ticket.status] || statusColors.open;
  const priorityConfig = priorityColors[ticket.priority] || priorityColors.normal;

  return (
    <button type="button" onClick={onClick} className="w-full p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] hover:border-[var(--action-primary)]/50 hover:bg-[var(--surface-elevated)] text-left transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-medium text-[var(--text-primary)] truncate">{ticket.title}</h3>
            <Badge variant={ticket.status === 'open' ? 'success' : ticket.status === 'resolved' ? 'success' : ticket.status === 'closed' ? 'neutral' : 'warning'} className="text-xs">{ticket.status.replace('_', ' ')}</Badge>
            <Badge variant={ticket.priority === 'critical' ? 'danger' : ticket.priority === 'high' ? 'warning' : 'secondary'} className="text-xs">{ticket.priority}</Badge>
          </div>
          <p className="text-sm text-[var(--text-secondary)] line-clamp-1">{ticket.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
            <span>#{ticket.referenceNumber}</span>
            <span>{ticket.eventName}</span>
            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <ChevronDown className="h-5 w-5 text-[var(--text-secondary)] shrink-0" />
      </div>
    </button>
  );
}

function MessageBubble({ message, isOwn }: { message: SupportMessage; isOwn: boolean }) {
  return (
    <div className={`flex gap-3 ${isOwn ? 'justify-end' : ''}`}>
      <div className={`max-w-[80%] ${isOwn ? 'order-2' : ''}`}>
        <div className={`rounded-2xl px-4 py-2.5 ${isOwn ? 'bg-[var(--action-primary-fill)] text-[var(--action-primary-foreground)] rounded-br-none' : 'bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-bl-none'}`}>
          <p className="text-sm">{message.content}</p>
          <p className="mt-1 text-xs opacity-60">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          {message.isInternal && <span className="inline-block mt-1 text-xs bg-[var(--accent-muted)] text-[var(--accent-foreground)] px-1.5 py-0.5 rounded">Internal note</span>}
        </div>
      </div>
    </div>
  );
}