

## Fix: Calendar Card Editing Not Working

### Root Cause

Two issues prevent editing cards from the calendar:

1. **Click guard fails silently**: When clicking a card, the code searches `columns` (from KanbanContext) to find which column it belongs to. If the card isn't found (e.g., columns haven't loaded, or the card belongs to a column not currently visible), `cardColumn` is `undefined` and the click is silently ignored — no dialog opens.

2. **Field name mismatch**: The calendar fetches cards directly from Supabase with snake_case fields (`due_date`, `start_date`, `is_holiday`, `card_emoji`, `project_name`), but `EditCardDialog` expects the `KanbanCard` interface with camelCase fields (`dueDate`, `startDate`, `isHoliday`, `cardEmoji`, `projectName`). So even if the dialog opened, the dates and other fields would appear empty.

### Fix Plan

**In `src/components/HijriCalendar.tsx`:**

1. **Map DB fields to KanbanCard shape** when fetching cards — convert `due_date` → `dueDate`, `start_date` → `startDate`, `is_holiday` → `isHoliday`, `card_emoji` → `cardEmoji`, `project_name` → `projectName` so the data works with `EditCardDialog`.

2. **Remove the `cardColumn &&` guard** on click — instead, find the column from `columns` if possible for the correct `columnId`, but fall back to a default column (e.g., `"todo"`) so the dialog always opens. The card's actual column can be looked up, but shouldn't block editing.

3. **Pass properly shaped card data** to `EditCardDialog` using the `KanbanCard` interface from context, so all fields (dates, tags, emoji, holiday flag) display correctly in the edit form.

### Scope
- Single file change: `src/components/HijriCalendar.tsx`
- The local `KanbanCard` interface at the top of the file will be removed in favor of using the context's `KanbanCard` type (already imported)
- Card fetching will include field mapping from snake_case to camelCase

