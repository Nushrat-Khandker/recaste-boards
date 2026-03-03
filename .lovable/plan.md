

## Current State: Where Notifications Come From

Right now, there is **only one trigger** generating notifications:

- **`on_chat_message_mention`** -- fires on `INSERT` into `chat_messages`, calls `create_mention_notifications()`. It only creates a notification when `mentioned_users` array is non-empty.

That's it. No other events (replies, card assignments, card updates, new chat messages) generate notifications. The `NotificationCenter` UI and real-time subscription work fine -- they just have nothing to show beyond mentions.

---

## Plan: Add Notification Triggers

### 1. Reply Notification Trigger (Database)

Create a new trigger function `create_reply_notifications` on `chat_messages` INSERT:
- When `reply_to` is not null, look up the original message's `user_id`
- If the replier is not the same person, insert a notification for the original author
- Title: "{sender_name} replied to your message"
- Link: `/chat` (or board-specific link based on context_type/context_id)

### 2. Card Assignment Notification Trigger (Database)

Create a new trigger function `create_assignment_notifications` on `kanban_cards` INSERT and UPDATE:
- On INSERT: if `assigned_to` is set and differs from `owner_id`, notify the assignee
- On UPDATE: if `assigned_to` changed (old != new), notify the new assignee
- Title: "{assigner} assigned you a task: {card_title}"
- Link: `/?card={card_id}` or similar

### 3. Migration SQL

Single migration with both trigger functions and their triggers attached to the respective tables.

### 4. No Frontend Changes Needed

The existing `NotificationCenter` component already:
- Subscribes to real-time `INSERT` on `notifications` table
- Displays title, message, link, and timestamps
- Handles read/unread state

The new triggers will automatically populate the same `notifications` table, and the UI will pick them up in real-time.

