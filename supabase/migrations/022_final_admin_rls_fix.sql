-- 022_final_admin_rls_fix.sql
-- Fixes RLS issues for Universities and Subjects once and for all by using a Security Definer function

-- 1. Create a secure function to check if the current user is a superadmin
-- This runs with elevated privileges (security definer) to bypass any recursive RLS checks on the profiles table itself.
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix Universities RLS
DROP POLICY IF EXISTS "universities_all_superadmin" ON universities;
DROP POLICY IF EXISTS "universities_write_admin" ON universities;

CREATE POLICY "universities_all_superadmin" ON universities
FOR ALL USING ( public.is_superadmin() ) WITH CHECK ( public.is_superadmin() );

-- 3. Fix Subjects RLS
DROP POLICY IF EXISTS "subjects_all_superadmin" ON subjects;
DROP POLICY IF EXISTS "subjects_write_admin" ON subjects;

CREATE POLICY "subjects_all_superadmin" ON subjects
FOR ALL USING ( public.is_superadmin() ) WITH CHECK ( public.is_superadmin() );

-- Ensure SELECT is still open to all authenticated users so the frontend dropdowns work
DROP POLICY IF EXISTS "universities_select_auth" ON universities;
CREATE POLICY "universities_select_auth" ON universities FOR SELECT USING (true);

DROP POLICY IF EXISTS "subjects_select_auth" ON subjects;
CREATE POLICY "subjects_select_auth" ON subjects FOR SELECT USING (true);
