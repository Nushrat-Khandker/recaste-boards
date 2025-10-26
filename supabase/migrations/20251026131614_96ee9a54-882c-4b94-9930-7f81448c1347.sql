-- Allow users to view other users' names (but not emails)
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a new policy that allows viewing all profiles for name display
CREATE POLICY "Users can view profiles for names"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);