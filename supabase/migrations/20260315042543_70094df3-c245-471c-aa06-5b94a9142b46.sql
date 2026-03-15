ALTER TABLE public.calendar_events 
ADD COLUMN event_type text NOT NULL DEFAULT 'personal',
ADD COLUMN visibility text NOT NULL DEFAULT 'private';