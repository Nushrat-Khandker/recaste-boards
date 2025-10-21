-- 1) Create helper functions to avoid recursive RLS lookups
CREATE OR REPLACE FUNCTION public.is_board_member(_user_id uuid, _board_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1 from public.board_members
    where user_id = _user_id and board_name = _board_name
  );
$$;

CREATE OR REPLACE FUNCTION public.has_board_role(_user_id uuid, _board_name text, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1 from public.board_members
    where user_id = _user_id and board_name = _board_name and role = _role
  );
$$;

-- 2) Drop old recursive policies and create new function-based ones for board_members
DROP POLICY IF EXISTS "Board owners can manage members" ON public.board_members;
DROP POLICY IF EXISTS "Board owners can insert members" ON public.board_members;
DROP POLICY IF EXISTS "Board owners can update members" ON public.board_members;
DROP POLICY IF EXISTS "Board owners can delete members" ON public.board_members;

CREATE POLICY "Board owners can insert members"
ON public.board_members
FOR INSERT
WITH CHECK (public.has_board_role(auth.uid(), board_name, 'owner'));

CREATE POLICY "Board owners can update members"
ON public.board_members
FOR UPDATE
USING (public.has_board_role(auth.uid(), board_name, 'owner'));

CREATE POLICY "Board owners can delete members"
ON public.board_members
FOR DELETE
USING (public.has_board_role(auth.uid(), board_name, 'owner'));

-- 3) Update kanban_cards policies to use helper functions (no direct subselects)
DROP POLICY IF EXISTS "Users can view cards in their boards" ON public.kanban_cards;
DROP POLICY IF EXISTS "Users can update cards they own or have editor access" ON public.kanban_cards;

CREATE POLICY "Users can view cards in their boards"
ON public.kanban_cards
FOR SELECT
USING ( (auth.uid() = owner_id) OR public.is_board_member(auth.uid(), project_name) );

CREATE POLICY "Users can update cards they own or have editor access"
ON public.kanban_cards
FOR UPDATE
USING (
  (auth.uid() = owner_id)
  OR public.has_board_role(auth.uid(), project_name, 'owner')
  OR public.has_board_role(auth.uid(), project_name, 'editor')
);