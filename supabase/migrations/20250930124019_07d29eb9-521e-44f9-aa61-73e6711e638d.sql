-- Add moved_date column to kanban_cards table
ALTER TABLE public.kanban_cards 
ADD COLUMN moved_date timestamp with time zone;