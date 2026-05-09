-- ============================================================
-- PROFILE FIXES & AUTOMATION
-- 1. Fix Recursive RLS
-- 2. Auto-create Profile on Signup
-- 3. Backfill existing users
-- ============================================================

-- 1. Helper Function to check Admin Status (Avoids RLS Recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix Recursive Policy in Profiles
DROP POLICY IF EXISTS "profiles_admin_select_all" ON public.profiles;
CREATE POLICY "profiles_admin_select_all"
  ON public.profiles
  FOR SELECT
  USING (is_admin());

-- 3. Trigger Function to Handle New User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role_id)
  VALUES (
    new.id,
    new.email,
    split_part(new.raw_user_meta_data->>'full_name', ' ', 1),
    split_part(new.raw_user_meta_data->>'full_name', ' ', 2),
    (SELECT id FROM public.roles WHERE name = 'employee' LIMIT 1)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-create Trigger (Safe for multiple runs)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Backfill Profiles for existing Auth Users
INSERT INTO public.profiles (id, email, role_id)
SELECT id, email, (SELECT id FROM public.roles WHERE name = 'employee' LIMIT 1)
FROM auth.users
ON CONFLICT (id) DO NOTHING;
