
CREATE OR REPLACE FUNCTION public.send_push_on_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url text;
  service_key text;
BEGIN
  -- Safely get settings, skip if not configured
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);
  
  IF supabase_url IS NULL OR service_key IS NULL OR supabase_url = '' OR service_key = '' THEN
    RAISE LOG 'Push notification skipped: app.settings not configured';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/push-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'action', 'send',
      'userId', NEW.user_id,
      'title', NEW.title,
      'message', COALESCE(NEW.message, ''),
      'url', COALESCE(NEW.link, '/')
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Push notification error: %', SQLERRM;
  RETURN NEW;
END;
$function$;
