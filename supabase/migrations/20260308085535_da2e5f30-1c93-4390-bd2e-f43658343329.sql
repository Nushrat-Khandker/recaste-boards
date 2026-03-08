-- Fix: The "All authenticated users can update cards" policy is RESTRICTIVE, 
-- meaning it AND the admin-only policy must BOTH pass. Non-admins fail the admin check.
-- Solution: Make the general update policy PERMISSIVE so either one passing is sufficient.

DROP POLICY IF EXISTS "All authenticated users can update cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "Admins can update all kanban cards" ON public.kanban_cards;

-- Recreate as PERMISSIVE (default) so either policy passing allows the update
CREATE POLICY "All authenticated users can update cards"
  ON public.kanban_cards
  FOR UPDATE
  TO authenticated
  USING (true);
