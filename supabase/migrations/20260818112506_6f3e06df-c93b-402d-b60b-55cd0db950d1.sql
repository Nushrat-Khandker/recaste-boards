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
  IF NEW.context_type IS NULL THEN
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

  ELSE
    -- Team / board / project chat: notify everyone else (admin excluded)
    title_text := CASE
      WHEN NEW.context_type = 'board' THEN sender_name || ' in board chat'
      WHEN NEW.context_type = 'project' THEN sender_name || ' in project chat'
      ELSE sender_name || ' in team chat'
    END;
    link_url := CASE
      WHEN NEW.context_type = 'board' AND NEW.context_id IS NOT NULL THEN '/projects?board=' || NEW.context_id
      WHEN NEW.context_type = 'project' AND NEW.context_id IS NOT NULL THEN '/projects?project=' || NEW.context_id
      ELSE '/messages'
    END;

    FOR member_id IN
      SELECT id FROM profiles
      WHERE id != NEW.user_id
        AND full_name IS NOT NULL
        AND (email IS NULL OR lower(email) <> 'mayordomo@recaste.com')
        AND NOT (NEW.mentioned_users IS NOT NULL AND id = ANY(NEW.mentioned_users))
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (member_id, 'chat_message', title_text, message_preview, link_url,
              jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.user_id, 'context_type', NEW.context_type));
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;
