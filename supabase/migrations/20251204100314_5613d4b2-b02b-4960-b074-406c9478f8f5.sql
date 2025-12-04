-- Add assigned_to column to kanban_cards table
ALTER TABLE public.kanban_cards 
ADD COLUMN assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;