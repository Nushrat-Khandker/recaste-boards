-- Step 1: Backfill full_name for existing profiles without names
UPDATE public.profiles p
SET full_name = COALESCE(
  (SELECT u.raw_user_meta_data->>'full_name' 
   FROM auth.users u 
   WHERE u.id = p.id),
  INITCAP(split_part(p.email, '@', 1))
)
WHERE (full_name IS NULL OR full_name = '') AND email IS NOT NULL;

-- Step 2: Recreate the trigger function to ensure it works correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      INITCAP(split_part(NEW.email, '@', 1))
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(
    EXCLUDED.full_name,
    INITCAP(split_part(EXCLUDED.email, '@', 1))
  ),
  email = EXCLUDED.email;
  
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();