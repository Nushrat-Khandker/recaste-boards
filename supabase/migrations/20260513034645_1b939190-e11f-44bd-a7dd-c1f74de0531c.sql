
-- 1. kanban_columns: drop permissive public policies
DROP POLICY IF EXISTS "Anyone can create columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Anyone can update columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Anyone can delete columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Anyone can view columns" ON public.kanban_columns;

CREATE POLICY "Authenticated can view columns" ON public.kanban_columns
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert columns" ON public.kanban_columns
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update columns" ON public.kanban_columns
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete columns" ON public.kanban_columns
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. kanban_cards: scope read/update to owner, assignee, or board members
DROP POLICY IF EXISTS "All authenticated users can view cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "All authenticated users can update cards" ON public.kanban_cards;

CREATE POLICY "Board members can view cards" ON public.kanban_cards
  FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR auth.uid() = assigned_to
    OR (project_name IS NOT NULL AND public.is_board_member(auth.uid(), project_name))
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Board members can update cards" ON public.kanban_cards
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id
    OR auth.uid() = assigned_to
    OR (project_name IS NOT NULL AND public.is_board_member(auth.uid(), project_name))
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR auth.uid() = assigned_to
    OR (project_name IS NOT NULL AND public.is_board_member(auth.uid(), project_name))
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 3. notifications: restrict INSERT to authenticated user inserting for self
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Users can create their own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
-- service_role bypasses RLS automatically; SECURITY DEFINER triggers (mention/reply/assignment) also bypass.

-- 4. profiles: hide email column from authenticated/anon
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;

-- 5. Drop automatic admin grant for @recaste.com sign-ups
DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
DROP TRIGGER IF EXISTS auto_grant_admin_to_recaste_users ON public.profiles;
DROP FUNCTION IF EXISTS public.grant_admin_to_recaste_users();

-- 6. Remove service_role_key from current_setting in trigger function
CREATE OR REPLACE FUNCTION public.notify_make_com_on_post_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  webhook_data jsonb;
  instagram_account_data record;
  service_key text;
BEGIN
  IF NEW.status = 'scheduled' AND (TG_OP = 'INSERT' OR OLD.status != 'scheduled') THEN
    -- Try to read the service role key from Supabase Vault. If unavailable, skip.
    BEGIN
      SELECT decrypted_secret INTO service_key
      FROM vault.decrypted_secrets
      WHERE name = 'SERVICE_ROLE_KEY'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      service_key := NULL;
    END;

    IF service_key IS NULL THEN
      RAISE LOG 'notify_make_com_on_post_schedule skipped: vault SERVICE_ROLE_KEY not configured';
      RETURN NEW;
    END IF;

    SELECT * INTO instagram_account_data
    FROM public.instagram_accounts
    WHERE id = NEW.instagram_account_id;

    webhook_data := jsonb_build_object(
      'post_id', NEW.id,
      'user_id', instagram_account_data.user_id,
      'instagram_account', jsonb_build_object(
        'id', instagram_account_data.id,
        'username', instagram_account_data.username,
        'account_type', instagram_account_data.account_type,
        'instagram_user_id', instagram_account_data.instagram_user_id
      ),
      'content', jsonb_build_object(
        'caption', NEW.caption,
        'media_urls', NEW.media_urls,
        'hashtags', NEW.hashtags
      ),
      'scheduling', jsonb_build_object(
        'scheduled_for', NEW.scheduled_for,
        'timezone', 'UTC',
        'post_immediately', false
      ),
      'metadata', jsonb_build_object(
        'post_type', NEW.post_type,
        'media_type', NEW.media_type,
        'content_item_id', NEW.content_item_id,
        'status', NEW.status
      ),
      'timestamp', now(),
      'source', 'ContentCal-AutoTrigger'
    );

    PERFORM net.http_post(
      url := 'https://usdhemikpmbcuwearsob.supabase.co/functions/v1/send-to-make',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := webhook_data
    );
  END IF;

  RETURN NEW;
END;
$function$;
