

## Chat System Robustness Improvements

I've analyzed the chat system and identified several issues that need to be fixed. Here's what I found and how I'll fix each one:

### Critical Issues

#### 1. File Upload Storage Policy (BROKEN)
The storage RLS policy for `board-files` has a bug that prevents ALL file uploads:
- Current policy: `auth.uid() = owner` 
- Problem: The `owner` column is NULL during INSERT operations
- Result: Every file upload fails

**Fix**: Update the storage policy to allow authenticated users to upload without checking owner:
```sql
DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;

CREATE POLICY "Authenticated users can upload to board-files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'board-files' 
  AND auth.role() = 'authenticated'
);
```

---

### Backend Storage Requirements

Your current setup is **adequate** - no additional backend storage is needed:
- `board-files` bucket exists and is public (good for sharing files)
- `chat_messages` table has proper schema with context support
- Realtime is enabled for chat_messages (live updates work)

---

### Frontend Improvements

#### 2. Add Loading States
Show a spinner while messages are loading initially, instead of jumping straight to "No messages yet"

#### 3. Add Optimistic Updates
When sending a message, show it immediately in the UI before the server confirms (with a subtle "sending" indicator)

#### 4. Add Error Retry
If a message fails to send, show a retry button instead of just a toast notification

#### 5. Add File Size Limits
Prevent uploads larger than 10MB with a helpful error message

#### 6. Add Upload Progress Indicator
Show a progress bar when uploading files so users know it's working

#### 7. Add Image/Video Previews
Display images and videos inline in the chat instead of just file links

#### 8. Add Message Pagination
Load messages in batches (e.g., 50 at a time) with "Load more" for older messages to prevent performance issues

#### 9. Wire Up Placeholder Buttons
- Emoji picker button currently does nothing - add emoji picker
- Code snippet button does nothing - add code formatting

---

### Implementation Order

1. **Fix storage RLS policy** (SQL migration) - unblocks file uploads
2. **Add loading state** for message fetch
3. **Add optimistic updates** for sending messages
4. **Add error retry UI** for failed messages
5. **Add file size validation** (10MB limit)
6. **Add upload progress** indicator
7. **Add inline image/video previews**
8. **Add message pagination** (50 messages at a time)
9. **Add emoji picker** (using a lightweight library)

---

### Technical Details

**Files to modify:**
- `src/components/board/ChatView.tsx` - Main chat component updates
- SQL migration for storage policy fix

**New dependencies needed:**
- Consider adding `emoji-mart` or similar for emoji picker

**Database changes:**
- Storage policy update only (no new tables needed)

