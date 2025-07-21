-- Create moon_phases table for storing lunar data
CREATE TABLE public.moon_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  phase TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.moon_phases ENABLE ROW LEVEL SECURITY;

-- Create policies for public access to moon phase data
CREATE POLICY "Anyone can view moon phases" 
ON public.moon_phases 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create moon phases" 
ON public.moon_phases 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update moon phases" 
ON public.moon_phases 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete moon phases" 
ON public.moon_phases 
FOR DELETE 
USING (true);

-- Create index for efficient date lookups
CREATE INDEX idx_moon_phases_date ON public.moon_phases(date);