-- Add file_attachments column to kanban_cards table
ALTER TABLE public.kanban_cards
ADD COLUMN file_attachments jsonb DEFAULT NULL;