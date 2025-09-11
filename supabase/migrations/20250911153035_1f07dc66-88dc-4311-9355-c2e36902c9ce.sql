-- Create trigger to automatically grant admin role to @recaste.com users
CREATE OR REPLACE TRIGGER on_auth_user_created_grant_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.grant_admin_to_recaste_users();