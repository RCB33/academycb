-- Migration to automate role assignment based on workers table

-- 1. Create the function that will be triggered on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger AS $$
DECLARE
  worker_record record;
BEGIN
  -- Check if the new user's email exists in the workers table
  SELECT * INTO worker_record FROM public.workers WHERE email = new.email;

  IF FOUND THEN
    -- If found, assign the role from the worker record, default to 'staff' if null
    -- We assume workers table has a role or we just assign 'coach' by default for this flow.
    -- Let's check if workers has a role column first, but since we didn't add one in 20240131160000_workers_crm.sql,
    -- we will default to 'coach' for any worker present in the workers table.
    
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', 'coach')
    ON CONFLICT (id) DO UPDATE SET role = 'coach';
    
    -- Also update the worker record with the new user_id to link them
    UPDATE public.workers SET user_id = new.id WHERE email = new.email;
    
  ELSE
    -- If not found in workers, default to 'guardian'
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', 'guardian')
    ON CONFLICT (id) DO NOTHING; -- If profile exists, don't overwrite role
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on auth.users
-- Note: Supabase auth triggers need to be applied in the auth schema.
-- We must drop it first if it exists to replace it safely.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_role();
