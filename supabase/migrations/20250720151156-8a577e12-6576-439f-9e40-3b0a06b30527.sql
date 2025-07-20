-- Drop the existing kanban_cards table
DROP TABLE IF EXISTS public.kanban_cards CASCADE;

-- Recreate kanban_cards table with same structure
CREATE TABLE public.kanban_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  column_id TEXT NOT NULL,
  project_name TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  number TEXT,
  quarter TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  start_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;

-- Recreate public access policies
CREATE POLICY "Anyone can view cards" 
ON public.kanban_cards 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create cards" 
ON public.kanban_cards 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update cards" 
ON public.kanban_cards 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete cards" 
ON public.kanban_cards 
FOR DELETE 
USING (true);

-- Recreate trigger for automatic timestamp updates
CREATE TRIGGER update_kanban_cards_updated_at
  BEFORE UPDATE ON public.kanban_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();