
-- Make calendar notes visible to all authenticated users
DROP POLICY IF EXISTS "Users can view their own calendar notes" ON public.calendar_notes;

CREATE POLICY "All authenticated users can view calendar notes"
ON public.calendar_notes
FOR SELECT
TO authenticated
USING (true);
