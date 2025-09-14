-- Allow public read access to kanban_cards so the board can display without auth
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read kanban cards" ON public.kanban_cards;
CREATE POLICY "Public can read kanban cards"
ON public.kanban_cards
FOR SELECT
USING (true);
