-- Fix security issue: Restrict project viewing to authenticated users only
DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;

-- Create new policy that only allows authenticated users to view projects
CREATE POLICY "Authenticated users can view projects" 
ON public.projects 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);