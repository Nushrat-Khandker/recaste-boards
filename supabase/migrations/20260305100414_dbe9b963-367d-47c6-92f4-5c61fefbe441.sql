
-- Allow all authenticated users to update any card (not just owner/board members)
DROP POLICY IF EXISTS "Board members can update cards" ON public.kanban_cards;

CREATE POLICY "All authenticated users can update cards"
ON public.kanban_cards
FOR UPDATE
TO authenticated
USING (true);
