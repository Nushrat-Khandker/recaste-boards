

## Plan: Calendar View Filters + Deduplicate Same-Day Cards

### Problems to Solve
1. **No user-level filtering** — everyone sees all cards and events; no way to view "my calendar" vs "team calendar"
2. **Duplicate entries when start date = due date** — both "start" and "due" entries appear for the same card on the same day
3. **No separation between personal events and team/work cards**

### Approach

#### 1. Fix Duplicate Display (Same Start & Due Date)
In `getCardsForDate()` in `HijriCalendar.tsx`, when a card's `startDate` and `dueDate` are the same day, only push a single `'due'` entry instead of both `'start'` and `'due'`.

#### 2. Add Calendar Filter Bar
Add a filter toolbar above the calendar grid with three view modes:

- **All** — shows all team cards + all calendar events (current behavior)
- **My Tasks** — shows only cards assigned to current user (`assignedTo`) or owned by them (`ownerId`), plus their personal calendar events (`user_id`)
- **Team** — shows only work/team cards (cards not personal events), useful for seeing the full team workload

This will be a simple toggle using existing `Tabs` UI component, placed in the calendar header area. Uses `useAuth()` to get the current user ID for filtering.

#### 3. Personal vs Team Calendar Events
Calendar events already have a `user_id` field. We'll use this to filter:
- In "My Tasks" mode: only show events where `user_id` matches current user
- In "All" mode: show all events
- In "Team" mode: show all cards but hide personal calendar events

### Files to Change

1. **`src/components/HijriCalendar.tsx`**:
   - Add `calendarFilter` state: `'all' | 'mine' | 'team'`
   - Add filter tabs UI in the header section
   - Modify `getCardsForDate()` to deduplicate same-day start/due
   - Modify `filterCards()` to apply user filter based on `calendarFilter`
   - Modify `getEventsForDate()` to filter by user when in "mine" mode
   - Import `useAuth` for current user

No database changes needed — all fields (`assigned_to`, `owner_id`, `user_id`) already exist.

