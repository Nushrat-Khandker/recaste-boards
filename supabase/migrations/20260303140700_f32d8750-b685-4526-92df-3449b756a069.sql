
-- 1. Reply notification trigger
CREATE OR REPLACE FUNCTION public.create_reply_notifications()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  original_author_id UUID;
  sender_name TEXT;
BEGIN
  IF NEW.reply_to IS NOT NULL THEN
    SELECT user_id INTO original_author_id FROM chat_messages WHERE id = NEW.reply_to;
    
    IF original_author_id IS NOT NULL AND original_author_id != NEW.user_id THEN
      SELECT COALESCE(full_name, 'Someone') INTO sender_name FROM profiles WHERE id = NEW.user_id;
      
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        original_author_id,
        'reply',
        sender_name || ' replied to your message',
        LEFT(NEW.content, 100),
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

CREATE TRIGGER on_chat_message_reply
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_reply_notifications();

-- 2. Card assignment notification trigger
CREATE OR REPLACE FUNCTION public.create_assignment_notifications()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  assigner_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM NEW.owner_id THEN
      SELECT COALESCE(full_name, 'Someone') INTO assigner_name FROM profiles WHERE id = NEW.owner_id;
      
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
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
      SELECT COALESCE(full_name, 'Someone') INTO assigner_name FROM profiles WHERE id = NEW.owner_id;
      
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
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

CREATE TRIGGER on_card_assignment
  AFTER INSERT OR UPDATE ON kanban_cards
  FOR EACH ROW
  EXECUTE FUNCTION create_assignment_notifications();
