
-- 1) Update mention link for channel/dm contexts
CREATE OR REPLACE FUNCTION public.create_mention_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  mentioned_user_id UUID;
  sender_name TEXT := 'Someone';
  profile_name TEXT;
BEGIN
  SELECT full_name INTO profile_name FROM profiles WHERE id = NEW.user_id;
  IF profile_name IS NOT NULL THEN sender_name := profile_name; END IF;

  IF NEW.mentioned_users IS NOT NULL THEN
    FOREACH mentioned_user_id IN ARRAY NEW.mentioned_users
    LOOP
      IF mentioned_user_id != NEW.user_id THEN
        INSERT INTO notifications (user_id, type, title, message, link, metadata)
        VALUES (
          mentioned_user_id, 'mention',
          sender_name || ' mentioned you',
          COALESCE(LEFT(NEW.content, 100), 'File attachment'),
          CASE NEW.context_type
            WHEN 'board' THEN '/projects?board=' || NEW.context_id
            WHEN 'project' THEN '/projects?project=' || NEW.context_id
            WHEN 'channel' THEN '/messages?channel=' || NEW.context_id
            WHEN 'dm' THEN '/messages?dm=' || NEW.context_id
            ELSE '/chat'
          END,
          jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.user_id, 'context_type', NEW.context_type, 'context_id', NEW.context_id)
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Update reply link similarly
CREATE OR REPLACE FUNCTION public.create_reply_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  original_author_id UUID;
  sender_name TEXT := 'Someone';
  profile_name TEXT;
BEGIN
  IF NEW.reply_to IS NOT NULL THEN
    SELECT user_id INTO original_author_id FROM chat_messages WHERE id = NEW.reply_to;
    IF original_author_id IS NOT NULL AND original_author_id != NEW.user_id THEN
      SELECT full_name INTO profile_name FROM profiles WHERE id = NEW.user_id;
      IF profile_name IS NOT NULL THEN sender_name := profile_name; END IF;

      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        original_author_id, 'reply',
        sender_name || ' replied to your message',
        COALESCE(LEFT(NEW.content, 100), 'File attachment'),
        CASE NEW.context_type
          WHEN 'board' THEN '/projects?board=' || NEW.context_id
          WHEN 'project' THEN '/projects?project=' || NEW.context_id
          WHEN 'channel' THEN '/messages?channel=' || NEW.context_id
          WHEN 'dm' THEN '/messages?dm=' || NEW.context_id
          ELSE '/chat'
        END,
        jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.user_id, 'original_message_id', NEW.reply_to)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) New: notify channel/DM members on every message
CREATE OR REPLACE FUNCTION public.create_channel_dm_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  member_id UUID;
  sender_name TEXT := 'Someone';
  profile_name TEXT;
  channel_name TEXT;
  conv_name TEXT;
  conv_is_group BOOLEAN;
  title_text TEXT;
  link_url TEXT;
  message_preview TEXT;
BEGIN
  IF NEW.context_type NOT IN ('channel', 'dm') THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO profile_name FROM profiles WHERE id = NEW.user_id;
  IF profile_name IS NOT NULL THEN sender_name := profile_name; END IF;

  message_preview := COALESCE(LEFT(NEW.content, 100), '📎 ' || COALESCE(NEW.file_name, 'File attachment'));

  IF NEW.context_type = 'channel' THEN
    SELECT name INTO channel_name FROM chat_channels WHERE id = NEW.context_id::uuid;
    title_text := sender_name || ' in #' || COALESCE(channel_name, 'channel');
    link_url := '/messages?channel=' || NEW.context_id;

    FOR member_id IN
      SELECT user_id FROM channel_members
      WHERE channel_id = NEW.context_id::uuid AND user_id != NEW.user_id
        AND NOT (NEW.mentioned_users IS NOT NULL AND user_id = ANY(NEW.mentioned_users))
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (member_id, 'channel_message', title_text, message_preview, link_url,
              jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.user_id, 'channel_id', NEW.context_id));
    END LOOP;
  ELSIF NEW.context_type = 'dm' THEN
    SELECT name, is_group INTO conv_name, conv_is_group FROM dm_conversations WHERE id = NEW.context_id::uuid;
    title_text := CASE WHEN conv_is_group AND conv_name IS NOT NULL
                       THEN sender_name || ' in ' || conv_name
                       ELSE sender_name END;
    link_url := '/messages?dm=' || NEW.context_id;

    FOR member_id IN
      SELECT user_id FROM dm_members
      WHERE conversation_id = NEW.context_id::uuid AND user_id != NEW.user_id
        AND NOT (NEW.mentioned_users IS NOT NULL AND user_id = ANY(NEW.mentioned_users))
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (member_id, 'dm_message', title_text, message_preview, link_url,
              jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.user_id, 'conversation_id', NEW.context_id));
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS chat_messages_channel_dm_notify ON public.chat_messages;
CREATE TRIGGER chat_messages_channel_dm_notify
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.create_channel_dm_notifications();

-- Ensure mention & reply triggers are attached too (idempotent)
DROP TRIGGER IF EXISTS on_chat_message_mention ON public.chat_messages;
CREATE TRIGGER on_chat_message_mention
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.create_mention_notifications();

DROP TRIGGER IF EXISTS on_chat_message_reply ON public.chat_messages;
CREATE TRIGGER on_chat_message_reply
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.create_reply_notifications();
