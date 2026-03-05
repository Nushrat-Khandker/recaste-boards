
-- Drop the restrictive SELECT policy on kanban_cards
DROP POLICY IF EXISTS "Users can view cards in their boards" ON public.kanban_cards;

-- Create a new policy allowing all authenticated users to see all cards
CREATE POLICY "All authenticated users can view cards"
ON public.kanban_cards
FOR SELECT
TO authenticated
USING (true);
