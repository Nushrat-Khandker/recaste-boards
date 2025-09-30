-- Drop existing restrictive policies for kanban_cards
DROP POLICY IF EXISTS "Authenticated users can create kanban cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "Authenticated users can update kanban cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "Authenticated users can delete kanban cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "Authenticated users can view kanban cards" ON public.kanban_cards;

-- Create public policies that allow anyone to manage kanban cards
CREATE POLICY "Anyone can create kanban cards"
ON public.kanban_cards
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can update kanban cards"
ON public.kanban_cards
FOR UPDATE
TO public
USING (true);

CREATE POLICY "Anyone can delete kanban cards"
ON public.kanban_cards
FOR DELETE
TO public
USING (true);