-- Create kanban_cards table for shared card management
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

-- Create kanban_columns table for column management
CREATE TABLE public.kanban_columns (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security but make it public access
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

-- Create public access policies (anyone can do anything)
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

CREATE POLICY "Anyone can view columns" 
ON public.kanban_columns 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create columns" 
ON public.kanban_columns 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update columns" 
ON public.kanban_columns 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete columns" 
ON public.kanban_columns 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_kanban_cards_updated_at
  BEFORE UPDATE ON public.kanban_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default columns
INSERT INTO public.kanban_columns (id, title, position) VALUES
('todo', 'To Do', 0),
('in-progress', 'In Progress', 1),
('done', 'Done', 2);