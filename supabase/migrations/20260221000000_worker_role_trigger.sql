-- Create a least-privilege profile for every new account. Staff and coach
-- roles must be assigned explicitly by an administrator; matching an email
-- address is not sufficient proof of authorization.

-- 1. Create the function that will be triggered on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'guardian')
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create the trigger on auth.users
-- Note: Supabase auth triggers need to be applied in the auth schema.
-- We must drop it first if it exists to replace it safely.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_role();
