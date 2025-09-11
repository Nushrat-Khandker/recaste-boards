-- First check and drop all existing policies for kanban_cards
DO $$ 
BEGIN
    -- Drop all existing policies if they exist
    DROP POLICY IF EXISTS "Public can read kanban cards" ON public.kanban_cards;
    DROP POLICY IF EXISTS "Allow inserts for kanban cards" ON public.kanban_cards;
    DROP POLICY IF EXISTS "Allow updates for kanban cards" ON public.kanban_cards;
    DROP POLICY IF EXISTS "Allow deletes for kanban cards" ON public.kanban_cards;
    
    -- Also drop any other potential policies
    DROP POLICY IF EXISTS "Authenticated users can view cards" ON public.kanban_cards;
    DROP POLICY IF EXISTS "Authenticated users can create cards" ON public.kanban_cards;
    DROP POLICY IF EXISTS "Authenticated users can update cards" ON public.kanban_cards;
    DROP POLICY IF EXISTS "Authenticated users can delete cards" ON public.kanban_cards;
END $$;

-- Now create comprehensive policies for the kanban board to work publicly
CREATE POLICY "Enable all access for kanban cards"
ON public.kanban_cards
FOR ALL
USING (true)
WITH CHECK (true);