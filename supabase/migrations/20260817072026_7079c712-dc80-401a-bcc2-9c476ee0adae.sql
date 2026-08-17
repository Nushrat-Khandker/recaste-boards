CREATE OR REPLACE FUNCTION public.send_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text := 'https://usdhemikpmbcuwearsob.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZGhlbWlrcG1iY3V3ZWFyc29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzOTg1MDcsImV4cCI6MjA2Nzk3NDUwN30.8cnuHbusw7XWs__Uv0C-VBlrXRdpQjuV-Z7FxrzpA64';
BEGIN
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/push-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
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
$$;