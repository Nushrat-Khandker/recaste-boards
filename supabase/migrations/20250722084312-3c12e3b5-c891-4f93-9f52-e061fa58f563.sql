-- Create solar events table for equinoxes and solstices
CREATE TABLE IF NOT EXISTS public.solar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.solar_events ENABLE ROW LEVEL SECURITY;

-- Create policies for solar events
CREATE POLICY "Anyone can view solar events" 
ON public.solar_events 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create solar events" 
ON public.solar_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update solar events" 
ON public.solar_events 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete solar events" 
ON public.solar_events 
FOR DELETE 
USING (true);

-- Insert 2025 solstices and equinoxes
INSERT INTO public.solar_events (date, type) VALUES
('2025-03-20', 'equinox_spring'),
('2025-06-21', 'solstice_summer'),
('2025-09-22', 'equinox_autumn'),
('2025-12-21', 'solstice_winter')
ON CONFLICT (date) DO NOTHING;