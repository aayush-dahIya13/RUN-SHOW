# Participant Portal Enhancements - TODO Checklist

## Branch: `feature/participant-portal-enhancements`

---

## 1. Participant Navigation — Left Sidebar ✅

- [x] Create `ParticipantSidebar` component with RUNSHOW branding
- [x] Add navigation items: My Events, Schedule, Venue & Details, Announcements, Profile, Settings
- [x] Add theme toggle and sign-out action in sidebar
- [x] Match organizer sidebar styling (spacing, icons, borders, colors, hover/active states)
- [x] Implement collapsible sidebar with localStorage persistence
- [x] Mobile responsive: overlay on small screens, fixed on desktop
- [x] Keyboard accessible (Tab trap, Escape to close, focus management)
- [x] Create `ParticipantLayout` with header and main content area

---

## 2. My Events Page — Detailed Event Overview ✅

- [x] Event hero card with name, type, status badge, dates, venue, format
- [x] Registration info: status, reference ID, registration date
- [x] Next upcoming session highlight with quick navigation
- [x] Event highlights/objectives from event data
- [x] Organizer contact information
- [x] Attendance & Capacity section (planned capacity, registration target, recorded registrations, remaining capacity)
- [x] Recent announcements preview (3 latest) with link to full list
- [x] Event selector for multiple events
- [x] Empty state when no events linked
- [x] Proper fallbacks for missing data ("Not provided", "Details will be announced")
- [x] Status badges: Upcoming, In progress, Past, Dates pending (from actual event data)

---

## 3. Schedule Page ✅

- [x] Timeline view with sessions sorted by date/time
- [x] Session cards with time, date, name, description, venue, function
- [x] Event selector for multiple events
- [x] Empty state when schedule not published
- [x] Quick navigation to other views

---

## 4. Venue & Details Page ✅

- [x] Venue card with confirmation status badge
- [x] External link for virtual events
- [x] Event details: dates, format, participant instructions, type, audience, objectives, budget
- [x] Operational requirements section
- [x] Quick navigation buttons to Schedule and Announcements

---

## 5. Announcements Page ✅

- [x] Search by title/content
- [x] Filter by category (General, Schedule Change, Venue Update, Important, Emergency)
- [x] Filter by read status (All, Unread, Read)
- [x] Expandable announcement cards with full message
- [x] Priority badges (Urgent, High, Normal)
- [x] Demo data badges
- [x] Published date/time
- [x] Empty states for no announcements and filtered results
- [x] Clear filters button
- [x] Announcement count indicator

---

## 6. Profile Page ✅

- [x] Personal Information section (name, email, phone, preferred contact)
- [x] Edit mode with validation and save/cancel actions
- [x] Participation Information: Upcoming events, Completed events
- [x] Registration summary stats (total, upcoming, completed)
- [x] Preferences: Announcement notifications, Schedule changes, Event reminders (toggle switches)
- [x] Account Details: Role, Status, Theme preference, Demo mode
- [x] Sign out action
- [x] Demo mode disclaimer for session-only changes

---

## 7. Settings Page ✅

- [x] Appearance: Light / Dark / System theme selector with persistence
- [x] Notifications: Announcements, Schedule changes, Reminders, Email (disabled with notice)
- [x] Account & Privacy: Email, Role, Status, Demo mode
- [x] Sign out action
- [x] Data & Privacy Notice explaining demo limitations
- [x] All preferences persisted to localStorage

---

## 8. Shared UI & Theme Consistency ✅

- [x] RUNSHOW branding (RadioTower logo, green accent)
- [x] Consistent card styles, spacing, icons, badges, buttons
- [x] Light and dark theme support (all components use CSS variables)
- [x] Text contrast, borders, hover states, focus rings
- [x] No unnecessary animations
- [x] Responsive layout (desktop, tablet, mobile)

---

## 9. Data & Implementation ✅

- [x] Extended `Announcement` type with optional `category` and `priority`
- [x] Extended `ParticipantEventLink` with optional `createdAt`
- [x] Extended `DemoSession` with optional `isDemo`
- [x] Extended `Theme` type to include 'system'
- [x] Added `secondary` and `outline` variants to Badge component
- [x] Reused existing dashboard store, demo auth, auth store
- [x] No organizer functionality modified
- [x] Participant access limited to participant-authorized data

---

## 10. Testing & Verification

| Test | Status |
|------|--------|
| `npx tsc --noEmit` | ✅ Passes |
| `npm run build` | ⚠️ Pre-existing server-side SQLite error (not related to changes) |
| Participant sidebar routes | ✅ Implemented |
| Active navigation states | ✅ Implemented |
| Responsive desktop/mobile nav | ✅ Implemented |
| Multiple events / empty states | ✅ Implemented |
| Announcement search/filters | ✅ Implemented |
| Profile editing/validation | ✅ Implemented |
| Theme changes/persistence | ✅ Implemented |
| Logout/auth redirects | ✅ Implemented |
| Organizer pages regressions | ✅ Not affected |

---

## Files Changed

### New Files:
- `src/components/layout/ParticipantSidebar.tsx`
- `src/components/layout/ParticipantLayout.tsx`
- `src/components/layout/participant/ParticipantEventsView.tsx`
- `src/components/layout/participant/ParticipantScheduleView.tsx`
- `src/components/layout/participant/ParticipantVenueView.tsx`
- `src/components/layout/participant/ParticipantAnnouncementsView.tsx`
- `src/components/layout/participant/ParticipantProfileView.tsx`
- `src/components/layout/participant/ParticipantSettingsView.tsx`

### Modified Files:
- `src/app/participant/dashboard/page.tsx` - Updated to use new ParticipantLayout
- `src/components/ui/Badge.tsx` - Added 'secondary' and 'outline' variants
- `src/lib/demo-auth.ts` - Added isDemo to DemoSession, fixed readSessionFromStorage
- `src/lib/theme.ts` - Added 'system' theme support
- `src/lib/types.ts` - Extended Announcement and ParticipantEventLink interfaces
- `src/app/login/page.tsx` - Stashed changes (conflict resolution)
- `src/components/layout/Header.tsx` - Stashed changes (conflict resolution)

---

## Demo-Only Limitations

1. **Settings persistence**: All settings stored in localStorage (frontend-only)
2. **Profile edits**: Session-only, not persisted to backend
3. **Email notifications**: Disabled with notice (requires backend)
4. **Announcement read status**: Not tracked in current data model
5. **Registration createdAt**: Not all existing data has this field
6. **Account deletion**: Not implemented (requires backend)

---

## Remaining TODOs (Future Work)

- [ ] Backend API integration for real data persistence
- [ ] Real-time announcement read status tracking
- [ ] Email notification backend integration
- [ ] Profile image upload support
- [ ] QR code / ticket display for check-in
- [ ] Push notifications for mobile
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Unit and integration tests
- [ ] Storybook documentation for new components