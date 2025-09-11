-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Enable all access for kanban cards" ON public.kanban_cards;

-- Create new restrictive policies for authenticated users only
CREATE POLICY "Authenticated users can view kanban cards" 
ON public.kanban_cards 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create kanban cards" 
ON public.kanban_cards 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update kanban cards" 
ON public.kanban_cards 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete kanban cards" 
ON public.kanban_cards 
FOR DELETE 
USING (auth.role() = 'authenticated');