-- Enable RLS and allow public read access to Kanban tables so the board can display cards without auth
-- Columns table: public readable
ALTER TABLE IF EXISTS public.kanban_columns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read kanban columns" ON public.kanban_columns;
CREATE POLICY "Public can read kanban columns"
ON public.kanban_columns
FOR SELECT
USING (true);

-- Cards table: public readable
ALTER TABLE IF EXISTS public.kanban_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read kanban cards" ON public.kanban_cards;
CREATE POLICY "Public can read kanban cards"
ON public.kanban_cards
FOR SELECT
USING (true);

-- Note: Inserts/updates/deletes remain restricted (no policies) and are only allowed via service role (edge functions)
-- This preserves write security while enabling read access for the public board view.