'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight, ChevronDown, ChevronUp, HelpCircle, X } from 'lucide-react';
import { useDemoSession } from '@/lib/demo-auth';
import { useDashboardStore } from '@/lib/dashboard-state';
import { useDismissableLayer } from '@/components/ui/useDismissableLayer';
import { Tooltip } from '@/components/ui/Tooltip';

type HelpItem = { question: string; answer: string; action?: string; target?: string };

const HELP: Record<string, HelpItem[]> = {
  organizer: [
    { question: 'How do I create an event?', answer: 'Open the event setup wizard to define the event and generate its working plan.', action: 'Create an event', target: 'setup' },
    { question: 'How do I read Event Health?', answer: 'Event Health brings together registration progress, task completion, blockers and next actions for the selected event.', action: 'Open Event Health', target: 'event-health' },
    { question: 'Where can I find registration gaps?', answer: 'The Dashboard summary compares registrations with each event target and highlights the remaining gap.', action: 'Open Dashboard', target: 'overview' },
    { question: 'How do I manage tasks?', answer: 'Tasks can be filtered by event, status and role. Status changes update the shared workspace.', action: 'Open Tasks', target: 'tasks' },
    { question: 'How do I assign a sub-organizer?', answer: 'Go to Settings, then Team & Access to create an account and assign event functions.', action: 'Open Settings', target: 'settings' },
    { question: 'Where are Settings and Calendar?', answer: 'Both are available in the organizer navigation.', action: 'Open Calendar', target: 'calendar' },
  ],
  sub_organizer: [
    { question: 'Where are my assigned events?', answer: 'Your My Work tab shows only events and functions assigned to your account.', action: 'View my work', target: 'work' },
    { question: 'How do I update a task?', answer: 'Open Tasks and use the status control beside a task. Updates are shared with the organizer.', action: 'View my tasks', target: 'tasks' },
    { question: 'What deadlines need attention?', answer: 'Overdue tasks are marked in your event task list and deadlines summary.', action: 'View my tasks', target: 'tasks' },
    { question: 'Where can I view relevant blockers?', answer: 'Relevant blockers appear in My Work, scoped to your event responsibilities.', action: 'View my work', target: 'work' },
  ],
  participant: [
    { question: 'Where is the event schedule?', answer: 'Choose Schedule to see published sessions in chronological order.', action: 'Find my schedule', target: 'schedule' },
    { question: 'How do I find the venue?', answer: 'Venue & Details shows the event location or online platform and whether it is confirmed.', action: 'View venue details', target: 'venue' },
    { question: 'Where can I see session times?', answer: 'Session times and locations are listed in the event Schedule.', action: 'View session times', target: 'schedule' },
    { question: 'Where are event announcements?', answer: 'Published updates for your linked events appear under Announcements.', action: 'View announcements', target: 'announcements' },
  ],
};

const TOURS: Record<string, { title: string; target: string; detail: string }[]> = {
  organizer: [
    { title: 'Home', target: 'home', detail: 'Your personalized welcome, upcoming events, urgent tasks and critical blockers.' },
    { title: 'Dashboard', target: 'overview', detail: 'Start here for event progress, registration gaps, recommendations and deadlines.' },
    { title: 'Calendar', target: 'calendar', detail: 'Browse event dates and open event details.' },
    { title: 'Event Health', target: 'event-health', detail: 'Review readiness, blockers and recommended next actions.' },
    { title: 'Tasks', target: 'tasks', detail: 'Track work by event and update task status.' },
    { title: 'Settings', target: 'settings', detail: 'Manage appearance and Team & Access.' },
  ],
  sub_organizer: [
    { title: 'My Work', target: 'work', detail: 'Your assigned event functions, progress and relevant blockers.' },
    { title: 'Tasks', target: 'tasks', detail: 'Update the tasks assigned to your functions.' },
    { title: 'Event Updates', target: 'updates', detail: 'Read announcements for your assigned events.' },
  ],
  participant: [
    { title: 'My Events', target: 'events', detail: 'See events linked to your account and attendance information.' },
    { title: 'Schedule', target: 'schedule', detail: 'Browse published event sessions and timings.' },
    { title: 'Venue & Details', target: 'venue', detail: 'Check venue confirmation and participant instructions.' },
    { title: 'Announcements', target: 'announcements', detail: 'Read updates shared with participants.' },
  ],
};

function Mascot({ small = false }: { small?: boolean }) {
  return <svg className={`runshow-mascot ${small ? 'h-9 w-9' : 'h-12 w-12'}`} viewBox="0 0 56 56" role="img" aria-label="Runshow helper mascot">
    <path className="mascot-body" d="M8 29c0-12 8-20 20-20s20 8 20 20c0 12-8 19-20 19S8 41 8 29Z" />
    <path className="mascot-ear" d="M15 15 12 8c-.6-1.5 1.3-2.7 2.5-1.6l7 5M41 15l3-7c.6-1.5-1.3-2.7-2.5-1.6l-7 5" />
    <ellipse cx="21" cy="27" rx="2.1" ry="3" className="mascot-eye" />
    <ellipse cx="35" cy="27" rx="2.1" ry="3" className="mascot-eye" />
    {small ? <path d="M25 35h6" className="mascot-mouth" /> : <path d="M23 33q5 6 10 0" className="mascot-mouth" />}
    <circle cx="14" cy="34" r="2.4" className="mascot-cheek" />
    <circle cx="42" cy="34" r="2.4" className="mascot-cheek" />
    <path d="m28 7 2 3h-4l2-3Z" className="mascot-star" />
  </svg>;
}

export function RunshowAssistant() {
  const session = useDemoSession();
  const pathname = usePathname();
  const setSelectedView = useDashboardStore(state => state.setSelectedView);
  const role = session?.role;
  const questions = useMemo(() => role ? HELP[role] ?? [] : [], [role]);
  const tourSteps = useMemo(() => role ? TOURS[role] ?? [] : [], [role]);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [response, setResponse] = useState<HelpItem | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dismissPanel = useCallback(() => {
    setOpen(false);
    setMinimized(false);
    setTourStep(null);
  }, []);
  useDismissableLayer(open, dismissPanel, panelRef);

  if (!session || !questions.length || pathname === '/login') return null;

  function navigate(target?: string) {
    if (!target || !role) return;
    if (role === 'organizer') {
      setSelectedView(target as 'home' | 'setup' | 'overview' | 'calendar' | 'event-health' | 'tasks' | 'settings');
      return;
    }
    window.dispatchEvent(new CustomEvent('runshow:workspace-tab', { detail: { tab: target } }));
  }

  function startTour() {
    setOpen(true);
    setMinimized(false);
    setResponse(null);
    setTourStep(0);
    navigate(tourSteps[0]?.target);
  }

  function advanceTour() {
    if (tourStep === null) return;
    const next = tourStep + 1;
    if (next >= tourSteps.length) {
      setTourStep(null);
      setResponse({ question: 'Tour complete', answer: 'You can restart the guided tour whenever you need a refresher.' });
      return;
    }
    setTourStep(next);
    navigate(tourSteps[next].target);
  }

  const tour = tourStep === null ? null : tourSteps[tourStep];

  return <div ref={panelRef} className="fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6" aria-live="polite">
    {open && !minimized && <section className="assistant-panel flex max-h-[min(72dvh,580px)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-primary)] shadow-2xl" aria-label="RUNSHOW guided help">
      <header className="flex items-center gap-3 border-b border-[var(--divider)] px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--success-surface)]"><Mascot small /></span>
        <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">RUNSHOW Guide</h2><p className="text-xs text-[var(--text-secondary)]">Guided help · {role === 'sub_organizer' ? 'Sub-organizer' : role === 'participant' ? 'Participant' : 'Organizer'}</p></div>
        <Tooltip label="Minimize help panel" side="top"><button type="button" onClick={() => setMinimized(true)} className="focus-ring rounded-md p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]" aria-label="Minimize help panel"><ChevronDown className="h-4 w-4" aria-hidden="true" /></button></Tooltip>
        <Tooltip label="Close help panel" side="top"><button type="button" onClick={() => { setOpen(false); setTourStep(null); }} className="focus-ring rounded-md p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]" aria-label="Close help panel"><X className="h-4 w-4" aria-hidden="true" /></button></Tooltip>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <p className="rounded-lg bg-[var(--surface-elevated)] p-3 text-sm text-[var(--text-secondary)]">I’m your in-app guide. Pick a question or follow a short tour of your workspace.</p>
        {tour && <div className="rounded-lg border border-[var(--action-primary)]/40 bg-[var(--success-surface)] p-3">
          <p className="text-xs font-semibold uppercase text-[var(--action-primary)]">Guided tour · {tourStep! + 1} of {tourSteps.length}</p>
          <h3 className="mt-1 font-semibold">{tour.title}</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">{tour.detail}</p>
          <div className="mt-3 flex gap-2"><button type="button" onClick={advanceTour} className="focus-ring inline-flex items-center gap-1 rounded-full bg-[var(--action-primary-fill)] px-3 py-2 text-sm font-medium text-[var(--action-primary-foreground)]">{tourStep === tourSteps.length - 1 ? 'Finish tour' : 'Next'}<ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => setTourStep(null)} className="focus-ring rounded-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]">Exit</button></div>
        </div>}
        {response && !tour && <div className="rounded-lg border border-[var(--border)] p-3"><p className="text-xs font-medium text-[var(--action-primary)]">{response.question}</p><p className="mt-1 text-sm text-[var(--text-primary)]">{response.answer}</p>{response.action && <button type="button" onClick={() => { navigate(response.target); dismissPanel(); }} className="focus-ring mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--action-primary-fill)] px-3 py-2 text-sm font-medium text-[var(--action-primary-foreground)]">{response.action}<ArrowRight className="h-4 w-4" /></button>}</div>}
        <div><h3 className="mb-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">Quick help</h3><div className="space-y-1.5">{questions.map(item => <button type="button" key={item.question} onClick={() => { setTourStep(null); setResponse(item); }} className="focus-ring flex w-full items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-2.5 text-left text-sm transition-colors hover:border-[var(--action-primary)]/50 hover:bg-[var(--surface-elevated)]"><span>{item.question}</span><ArrowRight className="h-4 w-4 shrink-0 text-[var(--action-primary)]" /></button>)}</div></div>
        <button type="button" onClick={startTour} className="focus-ring flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-elevated)]"><HelpCircle className="h-4 w-4 text-[var(--action-primary)]" />{tourStep === null ? 'Start guided tour' : 'Restart guided tour'}</button>
        <p className="text-xs text-[var(--text-muted)]">Guided tutorial assistance. No AI service is connected.</p>
      </div>
    </section>}
    {open && minimized && <button type="button" onClick={() => setMinimized(false)} className="focus-ring inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-card)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] shadow-lg" aria-label="Restore help panel"><Mascot small />RUNSHOW Guide<ChevronUp className="h-4 w-4" /></button>}
    {!open && <button type="button" onClick={() => { setOpen(true); setMinimized(false); }} className="assistant-launcher focus-ring group flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-card)] shadow-lg transition-transform hover:scale-[1.04]" aria-label="Open RUNSHOW guided help"><Mascot /><span className="sr-only">Open guided help</span></button>}
  </div>;
}
