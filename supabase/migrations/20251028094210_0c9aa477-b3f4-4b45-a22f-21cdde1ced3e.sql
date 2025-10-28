-- Drop existing policies on kanban_cards
DROP POLICY IF EXISTS "Users can insert cards in their boards" ON public.kanban_cards;
DROP POLICY IF EXISTS "Users can update cards they own or have editor access" ON public.kanban_cards;
DROP POLICY IF EXISTS "Users can delete cards they own" ON public.kanban_cards;

-- Create new, more permissive policies
-- Anyone authenticated can insert cards (they become the owner)
CREATE POLICY "Authenticated users can insert cards"
ON public.kanban_cards
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Board members and owners can update cards
CREATE POLICY "Board members can update cards"
ON public.kanban_cards
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = owner_id) 
  OR (project_name IS NOT NULL AND is_board_member(auth.uid(), project_name))
  OR (project_name IS NULL)
);

-- Board members and owners can delete cards
CREATE POLICY "Board members can delete cards"
ON public.kanban_cards
FOR DELETE
TO authenticated
USING (
  (auth.uid() = owner_id) 
  OR (project_name IS NOT NULL AND is_board_member(auth.uid(), project_name))
);