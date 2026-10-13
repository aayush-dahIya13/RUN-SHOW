'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardList, Eye, Loader2, Pencil, Plus, ShieldAlert, Trash2, Users } from 'lucide-react';
import { generateEventPlan, getDefaultEventSetupForm } from '@/lib/event-plan-generator';
import { useDashboardStore } from '@/lib/dashboard-state';
import { EventPlan, EventSetupFormData, Role, Task } from '@/lib/types';
import { ROLE_LABELS, PRIORITY_COLORS, STATUS_COLORS } from '@/lib/demo-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';

type FormErrors = Partial<Record<keyof EventSetupFormData, string>>;

const STEPS = [
  { title: 'Basics', icon: ClipboardList },
  { title: 'Timing', icon: CalendarDays },
  { title: 'Audience', icon: Users },
  { title: 'Operations', icon: ShieldAlert },
  { title: 'Preview', icon: Eye },
];

const EVENT_TYPES = ['Hackathon', 'Conference', 'Workshop', 'Meetup', 'Demo Day', 'Training Summit'];
const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
const TIMEZONE_OPTIONS = typeof Intl === 'undefined'
  ? [{ value: 'UTC', label: 'UTC' }]
  : [Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', 'UTC', 'Asia/Kolkata', 'Europe/London', 'America/New_York', 'America/Los_Angeles']
    .filter((value, index, values) => values.indexOf(value) === index)
    .map(value => ({ value, label: value }));

function numberValue(value: string): number {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function normalizeForm(saved?: Partial<EventSetupFormData>): EventSetupFormData {
  const defaults = getDefaultEventSetupForm();
  return { ...defaults, ...saved, sessions: saved?.sessions ?? defaults.sessions };
}

function validateStep(step: number, form: EventSetupFormData): FormErrors {
  const errors: FormErrors = {};

  if (step === 0) {
    if (!form.name.trim()) errors.name = 'Event name is required.';
    if (!form.type.trim()) errors.type = 'Choose or enter an event type.';
    if (!form.objectives.trim()) errors.objectives = 'Add at least one objective or description.';
  }
  if (step === 1) {
    if (!form.startDate) errors.startDate = 'Start date is required.';
    if (!form.endDate) errors.endDate = 'End date is required.';
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errors.endDate = 'End date must be on or after the start date.';
    }
    if (!form.startTime) errors.startTime = 'Start time is required.';
    if (!form.endTime) errors.endTime = 'End time is required.';
    if (form.startDate && form.endDate && form.startDate === form.endDate && form.startTime && form.endTime && form.endTime <= form.startTime) errors.endTime = 'End time must be after the start time.';
    if (!form.timezone.trim()) errors.timezone = 'Timezone is required.';
    if ((form.format === 'in-person' || form.format === 'hybrid') && !form.venue.trim()) errors.venue = 'Add the event venue or location.';
    if ((form.format === 'virtual' || form.format === 'hybrid') && !form.meetingUrl.trim() && !form.joiningInstructions.trim()) errors.meetingUrl = 'Add a meeting link or joining instructions.';
    if (form.meetingUrl.trim()) {
      try { new URL(form.meetingUrl); } catch { errors.meetingUrl = 'Enter a valid meeting URL, including https://.'; }
    }
  }
  if (step === 2) {
    if (!form.audience.trim()) errors.audience = 'Audience is required.';
    if (form.targetRegistrations < 1) errors.targetRegistrations = 'Target registrations must be at least 1.';
    if (!Number.isInteger(form.expectedAttendance) || form.expectedAttendance < 0) errors.expectedAttendance = 'Expected attendance must be a nonnegative whole number.';
    if (form.currentRegistrations < 0) errors.currentRegistrations = 'Current registrations cannot be negative.';
    if (form.currentRegistrations > form.targetRegistrations) {
      errors.currentRegistrations = 'Current registrations cannot exceed the target.';
    }
    if (form.participantCapacity !== undefined && (!Number.isInteger(form.participantCapacity) || form.participantCapacity < 1)) {
      errors.participantCapacity = 'Planned capacity must be a positive whole number.';
    }
    if (form.participantCapacity !== undefined && form.expectedAttendance > form.participantCapacity) errors.expectedAttendance = 'Expected attendance cannot exceed capacity.';
  }
  if (step === 3) {
    if (!form.registrationDeadline) errors.registrationDeadline = 'Add a registration deadline for the initial plan.';
    if (!form.contentDeadline) errors.contentDeadline = 'Add a content deadline for the initial plan.';
    if (form.expectedPartners > 0 && !form.partnerDeadline) errors.partnerDeadline = 'Add a partner deadline when partners are expected.';
    if (form.registrationDeadline && form.startDate && form.registrationDeadline > form.startDate) errors.registrationDeadline = 'Registration deadline should not be after the event starts.';
    if (form.contentDeadline && form.startDate && form.contentDeadline > form.startDate) errors.contentDeadline = 'Content deadline should not be after the event starts.';
    if (form.partnerDeadline && form.startDate && form.partnerDeadline > form.startDate) errors.partnerDeadline = 'Partner deadline should not be after the event starts.';
    if (!form.successMetrics.trim()) errors.successMetrics = 'Add at least one success metric.';
    if (!Number.isInteger(form.expectedPartners) || form.expectedPartners < 0) errors.expectedPartners = 'Expected partners must be a nonnegative whole number.';
    if (form.sessions?.some(session => !session.name.trim() || !session.date || !session.startTime || !session.endTime || !session.venue.trim())) {
      errors.sessions = 'Complete the title, date, times, and venue for each schedule session.';
    }
    if (form.sessions?.some(session => session.endTime <= session.startTime)) {
      errors.sessions = 'Each session must end after it starts.';
    }
    if (form.sessions?.some(session => session.date < form.startDate || session.date > form.endDate)) {
      errors.sessions = 'Each schedule session must fall within the event dates.';
    }
  }

  return errors;
}

function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="grid grid-cols-5 gap-2" aria-label="Setup progress">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isDone = index < currentStep;
        const isActive = index === currentStep;
        return (
          <div key={step.title} className="min-w-0">
            <div className={`h-1 rounded-full mb-3 ${isDone || isActive ? 'bg-[var(--action-primary)]' : 'bg-[var(--border)]'}`} />
            <div className={`flex items-center gap-2 text-xs sm:text-sm ${isActive ? 'text-[var(--action-primary)]' : isDone ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
              <span className={`w-7 h-7 rounded-lg border flex items-center justify-center ${isActive ? 'border-[var(--action-primary)] bg-[var(--success-surface)]' : isDone ? 'border-[var(--action-primary)]/40 bg-[var(--success-surface)]' : 'border-[var(--border)] bg-[var(--surface-elevated)]'}`}>
                {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </span>
              <span className="hidden sm:block truncate">{step.title}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlanPreview({ plan, onPlanChange, onEditSection }: { plan: EventPlan; onPlanChange: (plan: EventPlan) => void; onEditSection: (step: number) => void }) {
  const hasPastDeadline = [plan.eventDraft.registrationDeadline, plan.eventDraft.contentDeadline, plan.eventDraft.partnerDeadline].some(deadline => deadline && deadline < new Date().toISOString().slice(0, 10));
  const updateTask = (taskId: string, patch: Partial<Task>) => {
    onPlanChange({
      ...plan,
      tasks: plan.tasks.map(task => task.id === taskId ? { ...task, ...patch } : task),
    });
  };

  return (
    <div className="space-y-6">
      <Card variant="default" padding="sm">
        <CardTitle className="text-base">Event summary</CardTitle>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <SummaryItem label="Event" value={`${plan.eventDraft.name} · ${plan.eventDraft.type}`} />
          <SummaryItem label="Schedule" value={`${plan.eventDraft.startDate} ${plan.eventDraft.startTime} to ${plan.eventDraft.endDate} ${plan.eventDraft.endTime}`} />
          <SummaryItem label="Timezone" value={plan.eventDraft.timezone} />
          <SummaryItem label="Location" value={plan.eventDraft.format === 'virtual' ? plan.eventDraft.meetingUrl || plan.eventDraft.joiningInstructions : plan.eventDraft.venue} />
          <SummaryItem label="Audience" value={`${plan.eventDraft.audience} · ${plan.eventDraft.expectedAttendance.toLocaleString()} expected`} />
          <SummaryItem label="Registration and capacity" value={`${plan.eventDraft.targetRegistrations.toLocaleString()} target${plan.eventDraft.participantCapacity ? ` · ${plan.eventDraft.participantCapacity.toLocaleString()} capacity` : ''}`} />
          <SummaryItem label="Participant Access" value={`${plan.eventDraft.joiningEnabled !== false ? `Open (${plan.eventDraft.invitationAccessMode || 'both'})` : 'Disabled'}${plan.eventDraft.requireApproval ? ' · Approval required' : ''}`} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => onEditSection(0)}>Edit basics</Button><Button type="button" size="sm" variant="ghost" onClick={() => onEditSection(1)}>Edit timing</Button><Button type="button" size="sm" variant="ghost" onClick={() => onEditSection(2)}>Edit audience</Button><Button type="button" size="sm" variant="ghost" onClick={() => onEditSection(3)}>Edit operations</Button></div>
        {(!plan.eventDraft.participantCapacity || (!plan.eventDraft.meetingUrl && plan.eventDraft.format !== 'in-person')) && <p className="mt-4 rounded-md border border-[var(--accent)]/40 bg-[var(--accent-muted)] px-3 py-2 text-xs text-[var(--text-secondary)]">Some optional setup details are still missing. You can create the event now and complete them later.</p>}
        {hasPastDeadline && <p className="mt-3 rounded-md border border-[var(--accent)]/40 bg-[var(--accent-muted)] px-3 py-2 text-xs text-[var(--text-secondary)]">One or more plan deadlines have already passed. Review the suggested tasks before creating the event.</p>}
      </Card>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card variant="default" padding="sm">
          <CardTitle className="text-base">Timeline</CardTitle>
          <CardDescription>{plan.milestones.length} generated milestones</CardDescription>
          <div className="mt-4 space-y-3">
            {plan.milestones.map(milestone => (
              <div key={milestone.id} className="border-l-2 border-[var(--action-primary)]/40 pl-3">
                <p className="font-medium text-[var(--text-primary)] text-sm">{milestone.title}</p>
                <p className="text-xs text-[var(--text-muted)]">{milestone.deadline} · {ROLE_LABELS[milestone.owner]}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{milestone.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card variant="default" padding="sm">
          <CardTitle className="text-base">Outreach Targets</CardTitle>
          <CardDescription>Registration and partner channels</CardDescription>
          <div className="mt-4 space-y-3">
            {plan.outreachTargets.map(target => (
              <div key={target.channel} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[var(--text-secondary)]">{target.channel}</span>
                <span className="text-[var(--action-primary)] font-semibold">{target.target.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card variant="default" padding="sm">
          <CardTitle className="text-base">Success Metrics</CardTitle>
          <CardDescription>Used by leadership readiness view</CardDescription>
          <div className="mt-4 space-y-2">
            {plan.successMetrics.map(metric => (
              <div key={metric} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-[var(--action-primary)] mt-0.5 flex-shrink-0" />
                <span>{metric}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {!!plan.eventDraft.sessions?.length && <Card variant="default" padding="sm"><CardTitle className="text-base">Participant Schedule</CardTitle><CardDescription>{plan.eventDraft.sessions.length} sessions will be published with the event.</CardDescription><div className="mt-4 grid gap-3 md:grid-cols-2">{plan.eventDraft.sessions.map(session => <div key={session.id} className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] p-3"><p className="font-medium text-[var(--text-primary)]">{session.name}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{session.date} · {session.startTime}–{session.endTime} · {session.venue}</p>{session.functionName && <p className="mt-1 text-xs text-[var(--text-muted)]">{session.functionName}</p>}</div>)}</div></Card>}

      <Card variant="glass" padding="none">
        <CardHeader className="p-5 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Editable Task Plan</CardTitle>
              <CardDescription>System-generated suggestions based on your event inputs. Adjust or remove optional tasks before creating the event.</CardDescription>
            </div>
            <Badge variant="info" size="sm">Deterministic generator</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-3">
          {plan.tasks.map((task, index) => (
            <div key={task.id} className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]">
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr_0.8fr] gap-3">
                <Input
                  label={`Task ${index + 1}`}
                  value={task.title}
                  onChange={(event) => updateTask(task.id, { title: event.target.value })}
                />
                <Select
                  label="Owner"
                  value={task.assignee}
                  onChange={(event) => updateTask(task.id, { assignee: event.target.value as Role })}
                  options={ROLE_OPTIONS}
                />
                <Input
                  label="Deadline"
                  type="date"
                  value={task.deadline}
                  onChange={(event) => updateTask(task.id, { deadline: event.target.value })}
                />
              </div>
              <Textarea
                label="Description"
                value={task.description}
                onChange={(event) => updateTask(task.id, { description: event.target.value })}
                className="mt-3"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="neutral" className={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>
                <Badge variant="neutral" className={STATUS_COLORS[task.status]}>{task.status}</Badge>
                <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={() => onPlanChange({ ...plan, tasks: plan.tasks.filter(item => item.id !== task.id) })}><Trash2 className="h-4 w-4" aria-hidden="true" />Remove</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card variant="default" padding="sm">
        <CardTitle className="text-base">Risk Checkpoints</CardTitle>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {plan.risks.map(risk => (
            <div key={risk.id} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-[var(--text-primary)]">{risk.title}</p>
                <Badge variant={risk.severity === 'high' || risk.severity === 'critical' ? 'danger' : 'warning'} size="sm">
                  {risk.severity}
                </Badge>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-2">{risk.reason}</p>
              <p className="text-xs text-[var(--text-muted)] mt-2">{ROLE_LABELS[risk.owner]} · {risk.deadline}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p><p className="mt-1 break-words font-medium text-[var(--text-primary)]">{value || 'Not provided'}</p></div>;
}

export function EventSetupWizard() {
  const { confirmEventPlan, isSubmittingEvent, setupError, setGeneratedPlan, generatedPlan, isUsingApi } = useDashboardStore();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<EventSetupFormData>(() => normalizeForm(generatedPlan?.eventDraft));
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [plan, setPlan] = React.useState<EventPlan | null>(() => generatedPlan ? { ...generatedPlan, eventDraft: normalizeForm(generatedPlan.eventDraft) } : null);
  const [attemptedStep, setAttemptedStep] = React.useState(false);
  const currentStepHasErrors = hasErrors(validateStep(step, form));

  const updateForm = <K extends keyof EventSetupFormData>(key: K, value: EventSetupFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const goNext = () => {
    const nextErrors = validateStep(step, form);
    setErrors(nextErrors);
    setAttemptedStep(true);
    if (hasErrors(nextErrors)) return;

    if (step === 3) {
      const generated = generateEventPlan(form);
      setPlan(generated);
      setGeneratedPlan(generated);
    }
    setStep(prev => Math.min(prev + 1, STEPS.length - 1));
    setAttemptedStep(false);
  };

  const confirm = async () => {
    if (!plan) return;
    try {
      await confirmEventPlan(plan);
    } catch {
      // The shared store exposes a safe, actionable setupError for this failure.
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-5 h-5 text-[var(--action-primary)]" aria-hidden="true" />
            <Badge variant="info">Five-step setup</Badge>
          </div>
          <h2 className="runshow-scroll-heading text-3xl font-bold text-[var(--text-primary)] tracking-tight">Event Setup Wizard</h2>
          <p className="text-[var(--text-secondary)] mt-2 max-w-3xl">
            Capture event inputs, generate a reviewable operations plan, then open it in the existing command centre.
          </p>
        </div>
        {isUsingApi && <Badge variant="info" className="w-fit">Connected event service</Badge>}
      </div>

      <Card variant="glass" padding="none">
        <CardHeader className="p-6 pb-3">
          <StepIndicator currentStep={step} />
        </CardHeader>
        <CardContent className="p-6 pt-3">
          <motion.div key={step} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}>
            {step === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Event name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} error={errors.name} placeholder="Enter an event name" />
                <Select label="Event type" value={form.type} onChange={(event) => updateForm('type', event.target.value)} error={errors.type} options={[{ value: '', label: 'Choose an event type' }, ...EVENT_TYPES.map(type => ({ value: type, label: type }))]} />
                <Textarea className="md:col-span-2" label="Objectives or description" value={form.objectives} onChange={(event) => updateForm('objectives', event.target.value)} error={errors.objectives} placeholder="Describe the event goals and what success looks like" />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input label="Start date" type="date" value={form.startDate} onChange={(event) => updateForm('startDate', event.target.value)} error={errors.startDate} />
                <Input label="End date" type="date" value={form.endDate} onChange={(event) => updateForm('endDate', event.target.value)} error={errors.endDate} />
                <Select label="Event format" value={form.format} onChange={(event) => updateForm('format', event.target.value as EventSetupFormData['format'])} options={[{ value: 'in-person', label: 'In person' }, { value: 'virtual', label: 'Online' }, { value: 'hybrid', label: 'Hybrid' }]} />
                <Input label="Start time" type="time" value={form.startTime} onChange={(event) => updateForm('startTime', event.target.value)} error={errors.startTime} />
                <Input label="End time" type="time" value={form.endTime} onChange={(event) => updateForm('endTime', event.target.value)} error={errors.endTime} />
                <Select label="Timezone" value={form.timezone} onChange={(event) => updateForm('timezone', event.target.value)} error={errors.timezone} options={TIMEZONE_OPTIONS} />
                {(form.format === 'in-person' || form.format === 'hybrid') && <Input label="Venue or location" value={form.venue} onChange={(event) => updateForm('venue', event.target.value)} error={errors.venue} placeholder="Venue name, address, or city" />}
                {(form.format === 'virtual' || form.format === 'hybrid') && <Input label="Meeting URL" type="url" value={form.meetingUrl} onChange={(event) => updateForm('meetingUrl', event.target.value)} error={errors.meetingUrl} placeholder="https://..." helperText="A joining instruction may be used instead." />}
              </div>
              {(form.format === 'virtual' || form.format === 'hybrid') && <Textarea label="Joining instructions" value={form.joiningInstructions} onChange={(event) => updateForm('joiningInstructions', event.target.value)} placeholder="Describe how attendees should join" />}
              {form.startDate && form.endDate && <p className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-secondary)]">Schedule: {form.startDate} {form.startTime || 'time pending'} to {form.endDate} {form.endTime || 'time pending'} · {form.timezone}</p>}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Audience" value={form.audience} onChange={(event) => updateForm('audience', event.target.value)} error={errors.audience} placeholder="Students, developers, founders, sponsors" />
                  <Input label="Expected attendance" type="number" min={0} step={1} value={form.expectedAttendance} onChange={(event) => updateForm('expectedAttendance', numberValue(event.target.value))} error={errors.expectedAttendance} helperText="Planning estimate, not registrations." />
                  <Input label="Target registrations" type="number" min={1} value={form.targetRegistrations} onChange={(event) => updateForm('targetRegistrations', numberValue(event.target.value))} error={errors.targetRegistrations} />
                  <Input label="Maximum capacity" type="number" min={1} value={form.participantCapacity ?? ''} onChange={event => updateForm('participantCapacity', event.target.value ? numberValue(event.target.value) : undefined)} error={errors.participantCapacity} helperText="Separate from expected attendance and registration target." />
                  <Input label="Recorded registrations" type="number" min={0} value={form.currentRegistrations} onChange={(event) => updateForm('currentRegistrations', numberValue(event.target.value))} error={errors.currentRegistrations} helperText="Use 0 when registration has not opened." />
                  <Input label="Expected partners" type="number" min={0} value={form.expectedPartners} onChange={(event) => updateForm('expectedPartners', numberValue(event.target.value))} error={errors.expectedPartners} />
                  <div className="md:col-span-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-sm text-[var(--text-secondary)]">Planning summary: {form.expectedAttendance.toLocaleString()} expected · {form.targetRegistrations.toLocaleString()} registration target · {form.participantCapacity ? `${form.participantCapacity.toLocaleString()} maximum capacity` : 'capacity not set'}</div>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Participant Access & Invitations</h3>
                      <p className="text-xs text-[var(--text-secondary)]">Configure how participants discover and join this event.</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={form.joiningEnabled ?? true}
                        onChange={(e) => updateForm('joiningEnabled', e.target.checked)}
                        className="rounded border-[var(--border)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
                      />
                      Enable Participant Joining
                    </label>
                  </div>

                  {(form.joiningEnabled ?? true) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <Select
                        label="Invitation Access Mode"
                        value={form.invitationAccessMode ?? 'both'}
                        onChange={(e) => updateForm('invitationAccessMode', e.target.value as 'link' | 'code' | 'both')}
                        options={[
                          { value: 'both', label: 'Both Link and Code' },
                          { value: 'link', label: 'Direct Link Only' },
                          { value: 'code', label: 'Invitation Code Only' },
                        ]}
                      />
                      <Input
                        label="Invitation Expiry (Optional)"
                        type="datetime-local"
                        value={form.invitationExpiry ?? ''}
                        onChange={(e) => updateForm('invitationExpiry', e.target.value)}
                        helperText="Leaves link active until event starts if blank."
                      />
                      <Input
                        label="Per-Invite Usage Limit (Optional)"
                        type="number"
                        min={1}
                        value={form.invitationMaxUses ?? ''}
                        onChange={(e) => updateForm('invitationMaxUses', e.target.value ? numberValue(e.target.value) : undefined)}
                        placeholder="Unlimited if empty"
                        helperText="Limits how many participants can join using this specific invite."
                      />
                      <Input
                        label="Eligibility Restrictions (Optional)"
                        value={form.eligibilityRequirements ?? ''}
                        onChange={(e) => updateForm('eligibilityRequirements', e.target.value)}
                        placeholder="e.g. University students, hackathon alumni"
                        helperText="Displayed to participants prior to confirming join."
                      />
                      <div className="md:col-span-2 flex items-center gap-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-primary)]">
                          <input
                            type="checkbox"
                            checked={form.requireApproval ?? false}
                            onChange={(e) => updateForm('requireApproval', e.target.checked)}
                            className="rounded border-[var(--border)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
                          />
                          Require Organizer Approval before participant registration is confirmed
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Registration deadline" type="date" value={form.registrationDeadline} onChange={(event) => updateForm('registrationDeadline', event.target.value)} error={errors.registrationDeadline} helperText="Used for the registration task." />
                  <Input label="Content deadline" type="date" value={form.contentDeadline} onChange={(event) => updateForm('contentDeadline', event.target.value)} error={errors.contentDeadline} helperText="Used for programme and communication tasks." />
                  {form.expectedPartners > 0 && <Input label="Partner deadline" type="date" value={form.partnerDeadline} onChange={(event) => updateForm('partnerDeadline', event.target.value)} error={errors.partnerDeadline} helperText="Used for partner tasks." />}
                  <Input label="Optional budget" type="number" min={0} value={form.budget ?? ''} onChange={(event) => updateForm('budget', event.target.value ? numberValue(event.target.value) : undefined)} placeholder="250000" />
                  <Textarea label="Operational requirements" value={form.operationalRequirements} onChange={(event) => updateForm('operationalRequirements', event.target.value)} placeholder="Catering, AV, livestream, badge printing, volunteer staffing, accessibility" />
                  <Textarea label="Success metrics" value={form.successMetrics} onChange={(event) => updateForm('successMetrics', event.target.value)} error={errors.successMetrics} placeholder="Examples: attendee satisfaction, completed sessions, confirmed partners" />
                </div>
                <section className="border-t border-[var(--divider)] pt-4" aria-labelledby="participant-schedule-title">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="participant-schedule-title" className="font-semibold text-[var(--text-primary)]">Participant schedule</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Optional session details shown in the participant workspace.</p></div><Button type="button" variant="secondary" size="sm" onClick={() => updateForm('sessions', [...(form.sessions ?? []), { id: `draft-${Date.now()}`, name: '', date: form.startDate, startTime: '09:00', endTime: '10:00', venue: form.venue, description: '', functionName: '' }])}><Plus className="h-4 w-4" aria-hidden="true" />Add session</Button></div>
                  {errors.sessions && <p className="mt-2 text-sm text-[var(--danger)]" role="alert">{errors.sessions}</p>}
                  <div className="mt-4 space-y-4">{(form.sessions ?? []).map((session, index) => <div key={session.id} className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] p-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Input label={`Session ${index + 1}`} value={session.name} onChange={event => updateForm('sessions', form.sessions?.map(item => item.id === session.id ? { ...item, name: event.target.value } : item))} placeholder="Opening session" />
                    <Input label="Date" type="date" value={session.date} onChange={event => updateForm('sessions', form.sessions?.map(item => item.id === session.id ? { ...item, date: event.target.value } : item))} />
                    <Input label="Function" value={session.functionName ?? ''} onChange={event => updateForm('sessions', form.sessions?.map(item => item.id === session.id ? { ...item, functionName: event.target.value } : item))} placeholder="Orientation, Gaming..." />
                    <Input label="Start time" type="time" value={session.startTime} onChange={event => updateForm('sessions', form.sessions?.map(item => item.id === session.id ? { ...item, startTime: event.target.value } : item))} />
                    <Input label="End time" type="time" value={session.endTime} onChange={event => updateForm('sessions', form.sessions?.map(item => item.id === session.id ? { ...item, endTime: event.target.value } : item))} />
                    <Input label="Venue or room" value={session.venue} onChange={event => updateForm('sessions', form.sessions?.map(item => item.id === session.id ? { ...item, venue: event.target.value } : item))} placeholder="Main room" />
                    <div className="sm:col-span-2 lg:col-span-3"><Textarea label="Description" value={session.description} onChange={event => updateForm('sessions', form.sessions?.map(item => item.id === session.id ? { ...item, description: event.target.value } : item))} placeholder="What participants should expect" /></div>
                    <div className="sm:col-span-2 lg:col-span-3"><Button type="button" variant="ghost" size="sm" onClick={() => updateForm('sessions', form.sessions?.filter(item => item.id !== session.id))}>Remove session</Button></div>
                  </div>)}</div>
                </section>
              </div>
            )}

            {step === 4 && plan && (
              <PlanPreview
                plan={plan}
                onPlanChange={(updatedPlan) => {
                  setPlan(updatedPlan);
                  setGeneratedPlan(updatedPlan);
                }}
                onEditSection={(nextStep) => { setStep(nextStep); setAttemptedStep(false); }}
              />
            )}
          </motion.div>

          {setupError && (
            <div className="mt-5 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-surface)] p-3 text-sm text-[var(--danger)]" role="alert">
              {setupError}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[var(--divider)] pt-5">
            <Button variant="secondary" onClick={() => { setStep(prev => Math.max(prev - 1, 0)); setAttemptedStep(false); }} disabled={step === 0 || isSubmittingEvent}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              {step === 4 && (
                <Button variant="secondary" onClick={() => { setStep(0); setAttemptedStep(false); }} disabled={isSubmittingEvent}>
                  <Pencil className="w-4 h-4" />
                  Edit inputs
                </Button>
              )}
              {step < 4 ? (
                <Button onClick={goNext} disabled={isSubmittingEvent || (attemptedStep && currentStepHasErrors)}>
                  {step === 3 ? 'Generate plan' : 'Next'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={confirm} disabled={!plan || isSubmittingEvent} loading={isSubmittingEvent}>
                  {isSubmittingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirm and open dashboard
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
