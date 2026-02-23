

## Fix: Add Authentication Guard to Chat Page

### Problem
The `/chat` page has no authentication check. When you visit it without being logged in:
- The chat UI shows up but you can't send messages (errors occur because there's no user)
- There's no login prompt or redirect to the sign-in page

### Solution
Add an auth guard to the Chat page that:
1. Shows a loading spinner while checking auth status
2. If not logged in, redirects to `/auth` automatically
3. If logged in, shows the chat as normal

### Changes

**File: `src/pages/Chat.tsx`**
- Import `useAuth` from `AuthContext`
- Import `Navigate` from `react-router-dom`
- Add auth check: if `loading`, show spinner; if no `user`, redirect to `/auth`
- If authenticated, render the chat normally

This is a small, focused change -- just wrapping the existing chat content with an auth check. No database changes needed.

### Technical Details

```text
Chat page load flow (after fix):

  Visit /chat
      |
  Check auth state
      |
  +---+---+
  |       |
Loading  Done
  |       |
Spinner  +---+---+
         |       |
      No user   User exists
         |       |
  Redirect    Show chat
  to /auth
```

