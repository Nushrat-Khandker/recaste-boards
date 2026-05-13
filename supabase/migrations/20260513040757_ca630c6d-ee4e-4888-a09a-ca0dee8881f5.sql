
-- 1) moon_phases: restrict writes to authenticated
DROP POLICY IF EXISTS "Anyone can create moon phases" ON public.moon_phases;
DROP POLICY IF EXISTS "Anyone can update moon phases" ON public.moon_phases;
DROP POLICY IF EXISTS "Anyone can delete moon phases" ON public.moon_phases;
CREATE POLICY "Authenticated can create moon phases" ON public.moon_phases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update moon phases" ON public.moon_phases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete moon phases" ON public.moon_phases FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) solar_events: restrict writes to authenticated
DROP POLICY IF EXISTS "Anyone can create solar events" ON public.solar_events;
DROP POLICY IF EXISTS "Anyone can update solar events" ON public.solar_events;
DROP POLICY IF EXISTS "Anyone can delete solar events" ON public.solar_events;
CREATE POLICY "Authenticated can create solar events" ON public.solar_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update solar events" ON public.solar_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete solar events" ON public.solar_events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) archived_projects: only admins can delete
DROP POLICY IF EXISTS "Authenticated users can unarchive projects" ON public.archived_projects;
CREATE POLICY "Admins can unarchive projects" ON public.archived_projects FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) Storage policies for board-files: ownership-scoped update/delete
DROP POLICY IF EXISTS "Authenticated users can delete board-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update board-files" ON storage.objects;
CREATE POLICY "Owners can delete board-files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'board-files' AND auth.uid() = owner);
CREATE POLICY "Owners can update board-files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'board-files' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'board-files' AND auth.uid() = owner);

-- 5) Instagram tokens: revoke client read of sensitive columns
REVOKE SELECT (access_token, app_id, app_secret_name) ON public.instagram_accounts FROM anon, authenticated;

-- 6) Drop redundant text-overload of has_role and the policy that uses it
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP FUNCTION IF EXISTS public.has_role(uuid, text);

-- 7) Lock down EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.send_push_on_notification() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_mention_notifications() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_reply_notifications() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_assignment_notifications() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_make_com_on_post_schedule() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_board_member(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_board_role(uuid, text, text) FROM anon;
