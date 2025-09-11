-- Drop existing restrictive policies for kanban tables
DROP POLICY IF EXISTS "Authenticated users can view cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "Authenticated users can create cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "Authenticated users can update cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "Authenticated users can delete cards" ON public.kanban_cards;

-- Create new permissive policies for kanban_cards
CREATE POLICY "Public can read kanban cards"
ON public.kanban_cards
FOR SELECT
USING (true);

-- Allow inserts for all (Slack integration needs this)
CREATE POLICY "Allow inserts for kanban cards"
ON public.kanban_cards
FOR INSERT
WITH CHECK (true);

-- Allow updates for all (for moving cards, etc)
CREATE POLICY "Allow updates for kanban cards"
ON public.kanban_cards
FOR UPDATE
USING (true);

-- Allow deletes for all (for card management)
CREATE POLICY "Allow deletes for kanban cards"
ON public.kanban_cards
FOR DELETE
USING (true);