

## Fix Chat System Reliability

The chat system has several issues causing it to be unreliable. Here's a breakdown and the fix:

### Problems Identified

1. **No fallback when Realtime drops** -- The chat relies 100% on Supabase Realtime for live updates. If the connection drops silently (common with network changes, device sleep, etc.), messages stop appearing until page refresh.

2. **Only listens for INSERT events** -- The Realtime subscription only handles `INSERT`. If someone edits or deletes a message, other users won't see the change until they refresh.

3. **Optimistic message dedup is fragile** -- When a message is sent, a temp ID like `temp-123` is created. The Realtime INSERT comes back with the real UUID. The code tries to match by ID, but since temp IDs never match real IDs, duplicates can appear (the temp message stays AND the real one gets added).

4. **`loadMessages` has stale closure over `profilesMap`** -- The `useCallback` for `loadMessages` depends on `profilesMap`, which changes frequently, causing unnecessary re-renders and potential stale data.

5. **General chat uses `context_id = null`** -- For general chat, `contextId` is `null`, so the Realtime filter uses `context_id=is.null`. This filter syntax can be unreliable with Supabase Realtime.

### Solution

**Step 1: Add fallback polling to `useChatMessages.ts`**

Add a lightweight polling mechanism that kicks in as a safety net alongside Realtime:
- Poll every 5 seconds initially
- Back off to 30 seconds when no new messages detected
- Reset to 5 seconds when Realtime delivers a message (proving it's working)
- Only fetch messages newer than the last known `created_at` timestamp

**Step 2: Listen for ALL Realtime events (INSERT, UPDATE, DELETE)**

Expand the subscription from just `INSERT` to `*` (all events):
- `INSERT`: Add new message (with dedup)
- `UPDATE`: Update existing message content in place
- `DELETE`: Remove the deleted message from state

**Step 3: Fix optimistic message deduplication**

When a message is sent successfully:
- Remove the temp message immediately after the insert returns data
- Replace it with the real message from the server response
- The Realtime INSERT handler should check for duplicates by ID before adding

**Step 4: Fix stale closure in `loadMessages`**

Remove `profilesMap` from the `useCallback` dependency array and use a ref instead to avoid unnecessary re-creations of the function.

**Step 5: Improve general chat Realtime filter**

For general/project contexts where `contextId` is null, use a simpler filter that only filters by `context_type` to avoid the unreliable `is.null` filter syntax.

### Technical Details

**Files to modify:**
- `src/components/chat/useChatMessages.ts` -- Add polling fallback, fix Realtime subscription, fix dedup logic, fix stale closures
- `src/components/chat/ChatView.tsx` -- Fix optimistic update flow so temp messages are properly replaced with server response

**No new dependencies or database changes needed.**

### What This Fixes
- Messages will always appear even if Realtime drops silently
- Edits and deletes by other users will be reflected in real-time
- No more duplicate messages appearing after sending
- Better performance from fewer unnecessary re-renders
