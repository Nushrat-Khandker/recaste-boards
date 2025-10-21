-- Allow viewing cards that have no owner (legacy/public cards)
DROP POLICY IF EXISTS "Users can view cards in their boards" ON public.kanban_cards;

CREATE POLICY "Users can view cards in their boards"
ON public.kanban_cards
FOR SELECT
USING ( 
  owner_id IS NULL 
  OR auth.uid() = owner_id 
  OR public.is_board_member(auth.uid(), project_name) 
);