-- Ensure profiles are saved automatically when a user signs up
-- Create trigger to call existing public.handle_new_user()
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();