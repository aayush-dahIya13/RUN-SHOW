# PARTICIPANT EVENT PLATFORM — TODO Checklist

## Branch: `feature/participant-event-platform` (to be created from `feature/participant-portal-enhancements`)

---

## Implementation Plan Overview

### Phase 1: Data Model Extensions & API Routes
- [ ] Extend Event type with visibility (public/private), pricing, capacity, registration fields
- [ ] Add Invitation model (code, token, eventId, createdBy, expiresAt, maxUses, usedCount, revoked)
- [ ] Add Registration model extensions (payment status, ticket type, invitationCode)
- [ ] Add SupportTicket model (eventId, participantId, category, title, description, status, priority, assignee, messages)
- [ ] Add SupportMessage model (ticketId, senderId, content, isInternal, createdAt)
- [ ] Create API routes for public event discovery (GET /api/events/public)
- [ ] Create API routes for event registration (POST /api/events/[eventId]/register)
- [ ] Create API routes for invitation management (POST/GET/DELETE /api/events/[eventId]/invitations)
- [ ] Create API routes for invitation validation (POST /api/join/[code])
- [ ] Create API routes for support tickets (GET/POST /api/support/tickets, GET/PATCH /api/support/tickets/[id])
- [ ] Create database migrations for new tables

### Phase 2: Public Event Discovery (Feature 1)
- [ ] Add "Explore Events" to participant sidebar
- [ ] Create ExploreEventsView with search, filters, sorting
- [ ] Create EventCard component for public catalogue
- [ ] Create EventDetailsPage for public events
- [ ] Implement registration flow (free events)
- [ ] Implement paid event registration demo flow
- [ ] Add "My Registrations" section to My Events page
- [ ] Organizer event visibility toggle (public/private) in EventSetupWizard

### Phase 3: Private Events & Invitations (Feature 2)
- [ ] Add "Join with Invitation" to participant sidebar
- [ ] Create JoinInvitationView with code/URL input
- [ ] Create invitation validation page (/join/[code])
- [ ] Add invitation management to organizer event details
- [ ] Implement invitation generation (codes & links)
- [ ] Implement invitation validation (expiry, revocation, usage limits)
- [ ] Ensure private events excluded from public catalogue

### Phase 4: Support Centre & Semi-AI Assistant (Feature 3)
- [ ] Add "Help & Support" and "My Support Requests" to participant sidebar
- [ ] Create SupportCentreView with chat-style assistant
- [ ] Implement rule-based FAQ matching using event data
- [ ] Create "Report a Problem" flow with ticket creation
- [ ] Create MySupportRequestsView for participants
- [ ] Add SupportInbox to organizer dashboard
- [ ] Implement ticket routing to event team
- [ ] Add internal notes (hidden from participants)
- [ ] Implement status/priority workflow
- [ ] Add notifications for ticket updates

### Phase 5: Integration & Polish
- [ ] Update database migrations
- [ ] Run TypeScript and build checks
- [ ] Test all workflows end-to-end
- [ ] Update TODO checklist with results

---

## Current Status

### Already Implemented (from participant-portal-enhancements)
- [x] Participant sidebar with left navigation
- [x] My Events, Schedule, Venue & Details, Announcements, Profile, Settings views
- [x] ParticipantLayout with header and responsive sidebar
- [x] Type extensions for Announcement (category, priority) and ParticipantEventLink (createdAt)
- [x] Theme system with 'system' option
- [x] Badge component with secondary/outline variants

### Files Changed (from previous work)
- `src/app/participant/dashboard/page.tsx` — Updated to use ParticipantLayout
- `src/components/layout/ParticipantLayout.tsx` — New layout component
- `src/components/layout/ParticipantSidebar.tsx` — New sidebar component
- `src/components/layout/participant/ParticipantEventsView.tsx`
- `src/components/layout/participant/ParticipantScheduleView.tsx`
- `src/components/layout/participant/ParticipantVenueView.tsx`
- `src/components/layout/participant/ParticipantAnnouncementsView.tsx`
- `src/components/layout/participant/ParticipantProfileView.tsx`
- `src/components/layout/participant/ParticipantSettingsView.tsx`
- `src/components/ui/Badge.tsx` — Added variants
- `src/lib/demo-auth.ts` — isDemo field
- `src/lib/theme.ts` — system theme
- `src/lib/types.ts` — Extended interfaces

---

## Features to Implement

### 1. Public Event Discovery
| Task | Status |
|------|--------|
| Extend Event type with visibility, pricing, registration fields | ⬜ |
| Add public event API route with filters | ⬜ |
| Create ExploreEventsView component | ⬜ |
| Create EventDetailsPage for public events | ⬜ |
| Implement free registration flow | ⬜ |
| Implement paid registration demo flow | ⬜ |
| Add My Registrations to My Events | ⬜ |
| Add visibility toggle in EventSetupWizard | ⬜ |

### 2. Private Events & Invitations
| Task | Status |
|------|--------|
| Add Invitation model and API routes | ⬜ |
| Create JoinInvitationView component | ⬜ |
| Create invitation validation page | ⬜ |
| Add invitation management to organizer view | ⬜ |
| Implement invitation validation logic | ⬜ |
| Exclude private events from public API | ⬜ |

### 3. Support Centre & Semi-AI Assistant
| Task | Status |
|------|--------|
| Add SupportTicket and SupportMessage models | ⬜ |
| Create SupportCentreView with chat interface | ⬜ |
| Implement FAQ matching with event data | ⬜ |
| Create ticket creation flow | ⬜ |
| Create MySupportRequestsView | ⬜ |
| Add SupportInbox to organizer dashboard | ⬜ |
| Implement ticket routing and escalation | ⬜ |
| Add internal notes for organizers | ⬜ |

---

## Verification Results (to be filled after implementation)

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] All participant sidebar routes work
- [ ] Public event discovery works
- [ ] Registration flow works (free & paid demo)
- [ ] Invitation join flow works
- [ ] Private events not discoverable
- [ ] Support tickets create and route correctly
- [ ] Internal notes hidden from participants
- [ ] Organizer support inbox shows tickets
- [ ] No regressions in existing organizer/participant features

---

## Known Limitations & Demo-Only Items

- [ ] Payment integration: demo-only, no real payment processing
- [ ] AI assistant: rule-based fallback, no LLM configured
- [ ] Email/push notifications: in-app only, external delivery not configured
- [ ] Database: SQLite for demo, migrations needed for production
- [ ] Invitation tokens: stored in localStorage for demo, should be server-validated in production

---

## Required External Configuration

- [ ] Payment provider credentials (Stripe/etc.) — if payment integration added
- [ ] AI provider API key (OpenAI/Anthropic) — if AI assistant enabled
- [ ] Email service credentials (SendGrid/Resend) — if email notifications enabled
- [ ] Database connection string for production

---

## Files Expected to Change (Estimated)

### New Files
- `src/lib/types.ts` — Extended with new models
- `src/lib/dashboard-state.ts` — Extended store with new actions
- `src/app/api/events/public/route.ts` — Public event discovery
- `src/app/api/events/[eventId]/register/route.ts` — Registration
- `src/app/api/events/[eventId]/invitations/route.ts` — Invitation management
- `src/app/api/join/[code]/route.ts` — Invitation validation
- `src/app/api/support/tickets/route.ts` — Support tickets
- `src/app/api/support/tickets/[id]/route.ts` — Ticket details
- `src/components/layout/participant/ExploreEventsView.tsx`
- `src/components/layout/participant/EventDetailsPage.tsx`
- `src/components/layout/participant/JoinInvitationView.tsx`
- `src/components/layout/participant/SupportCentreView.tsx`
- `src/components/layout/participant/MySupportRequestsView.tsx`
- `src/components/dashboard/SupportInbox.tsx` (organizer)
- `database/migrations/002_participant_platform.sql`

### Modified Files
- `src/components/layout/ParticipantSidebar.tsx` — New nav items
- `src/components/layout/ParticipantLayout.tsx` — New view routing
- `src/components/layout/participant/ParticipantEventsView.tsx` — My Registrations
- `src/components/event-setup/EventSetupWizard.tsx` — Visibility toggle
- `src/lib/types.ts` — New interfaces
- `src/lib/dashboard-state.ts` — New store actions
- `database/migrations/001_initial.sql` — Extended schema (or new migration)

---

## Next Steps

1. Create new branch `feature/participant-event-platform`
2. Start with Phase 1: Data model extensions and API routes
3. Implement incrementally with verification at each step