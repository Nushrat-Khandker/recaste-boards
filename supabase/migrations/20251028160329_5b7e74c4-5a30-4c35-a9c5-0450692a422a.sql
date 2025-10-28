-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mention', 'project_activity', 'card_update', 'message')),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Service role can insert notifications (for triggers)
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Add index for better performance
CREATE INDEX idx_notifications_user_id_read ON public.notifications(user_id, read, created_at DESC);

-- Function to create mention notifications
CREATE OR REPLACE FUNCTION public.create_mention_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mentioned_user_id UUID;
  sender_name TEXT;
BEGIN
  -- Get sender's name
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.user_id;
  sender_name := COALESCE(sender_name, 'Someone');
  
  -- Create notification for each mentioned user
  IF NEW.mentioned_users IS NOT NULL THEN
    FOREACH mentioned_user_id IN ARRAY NEW.mentioned_users
    LOOP
      -- Don't notify if user mentions themselves
      IF mentioned_user_id != NEW.user_id THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          link,
          metadata
        ) VALUES (
          mentioned_user_id,
          'mention',
          sender_name || ' mentioned you',
          LEFT(NEW.content, 100),
          CASE 
            WHEN NEW.context_type = 'board' THEN '/projects?board=' || NEW.context_id
            WHEN NEW.context_type = 'project' THEN '/projects?project=' || NEW.context_id
            ELSE '/chat'
          END,
          jsonb_build_object(
            'message_id', NEW.id,
            'sender_id', NEW.user_id,
            'context_type', NEW.context_type,
            'context_id', NEW.context_id
          )
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for mention notifications
CREATE TRIGGER on_chat_message_mention
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_mention_notifications();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

COMMENT ON TABLE public.notifications IS 'Stores user notifications for mentions and activity';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification: mention, project_activity, card_update, message';
COMMENT ON COLUMN public.notifications.metadata IS 'Additional data about the notification';