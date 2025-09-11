-- Fix photos table security - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view photos" ON public.photos;

-- Create new restrictive policies for photos table
CREATE POLICY "Authenticated users can view photos" 
ON public.photos 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Keep existing policies for insert, update, delete as they are already secure