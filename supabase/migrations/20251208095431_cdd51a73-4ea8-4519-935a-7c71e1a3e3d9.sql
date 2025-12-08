-- Create table to track archived projects
CREATE TABLE public.archived_projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name text NOT NULL UNIQUE,
    archived_at timestamp with time zone NOT NULL DEFAULT now(),
    archived_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.archived_projects ENABLE ROW LEVEL SECURITY;

-- Policies - authenticated users can view and manage archived projects
CREATE POLICY "Authenticated users can view archived projects"
ON public.archived_projects
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can archive projects"
ON public.archived_projects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = archived_by);

CREATE POLICY "Authenticated users can unarchive projects"
ON public.archived_projects
FOR DELETE
TO authenticated
USING (true);