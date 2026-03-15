
-- Fix: Handle NULL sender_name properly for file messages and missing profiles
-- The issue was that sender_name could be NULL when profile doesn't exist

CREATE OR REPLACE FUNCTION public.create_mention_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mentioned_user_id UUID;
  sender_name TEXT := 'Someone';
  profile_name TEXT;
BEGIN
  -- Get sender's name safely
  SELECT full_name INTO profile_name FROM profiles WHERE id = NEW.user_id;
  IF profile_name IS NOT NULL THEN
    sender_name := profile_name;
  END IF;
  
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
          COALESCE(LEFT(NEW.content, 100), 'File attachment'),
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

-- Fix reply notification trigger with same pattern
CREATE OR REPLACE FUNCTION public.create_reply_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  original_author_id UUID;
  sender_name TEXT := 'Someone';
  profile_name TEXT;
BEGIN
  IF NEW.reply_to IS NOT NULL THEN
    SELECT user_id INTO original_author_id FROM chat_messages WHERE id = NEW.reply_to;
    
    IF original_author_id IS NOT NULL AND original_author_id != NEW.user_id THEN
      SELECT full_name INTO profile_name FROM profiles WHERE id = NEW.user_id;
      IF profile_name IS NOT NULL THEN
        sender_name := profile_name;
      END IF;
      
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        metadata
      ) VALUES (
        original_author_id,
        'reply',
        sender_name || ' replied to your message',
        COALESCE(LEFT(NEW.content, 100), 'File attachment'),
        CASE 
          WHEN NEW.context_type = 'board' THEN '/projects?board=' || NEW.context_id
          WHEN NEW.context_type = 'project' THEN '/projects?project=' || NEW.context_id
          ELSE '/chat'
        END,
        jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.user_id, 'original_message_id', NEW.reply_to)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix card assignment trigger with same pattern
CREATE OR REPLACE FUNCTION public.create_assignment_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigner_name TEXT := 'Someone';
  profile_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM NEW.owner_id THEN
      SELECT full_name INTO profile_name FROM profiles WHERE id = NEW.owner_id;
      IF profile_name IS NOT NULL THEN
        assigner_name := profile_name;
      END IF;
      
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        metadata
      ) VALUES (
        NEW.assigned_to,
        'assignment',
        assigner_name || ' assigned you a task',
        NEW.title,
        '/?card=' || NEW.id,
        jsonb_build_object('card_id', NEW.id, 'assigner_id', NEW.owner_id)
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
      SELECT full_name INTO profile_name FROM profiles WHERE id = NEW.owner_id;
      IF profile_name IS NOT NULL THEN
        assigner_name := profile_name;
      END IF;
      
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        metadata
      ) VALUES (
        NEW.assigned_to,
        'assignment',
        assigner_name || ' assigned you a task',
        NEW.title,
        '/?card=' || NEW.id,
        jsonb_build_object('card_id', NEW.id, 'assigner_id', NEW.owner_id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
