-- 005_fix_recursion.sql

-- 1. Create a SECURITY DEFINER function to safely check admin status without triggering RLS on profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
$$;

-- 2. Drop all recursive policies
DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
DROP POLICY IF EXISTS "unis_write_admin" ON universities;
DROP POLICY IF EXISTS "subjects_write_admin" ON subjects;
DROP POLICY IF EXISTS "questions_admin_all" ON questions;
DROP POLICY IF EXISTS "subs_admin_all" ON subscriptions;

-- 3. Recreate them using the safe is_admin() function
CREATE POLICY "profiles_admin_select_all" ON profiles FOR SELECT USING ( public.is_admin() );
CREATE POLICY "unis_write_admin" ON universities FOR ALL USING ( public.is_admin() );
CREATE POLICY "subjects_write_admin" ON subjects FOR ALL USING ( public.is_admin() );
CREATE POLICY "questions_admin_all" ON questions FOR ALL USING ( public.is_admin() );
CREATE POLICY "subs_admin_all" ON subscriptions FOR ALL USING ( public.is_admin() );
