-- 004_fix_rls.sql

-- Drop existing restricted policies
DROP POLICY IF EXISTS "unis_select_auth" ON universities;
DROP POLICY IF EXISTS "subjects_select_auth" ON subjects;

-- Create open policies for anon users to read universities and subjects (needed for registration)
CREATE POLICY "unis_select_auth" ON universities FOR SELECT USING (true);
CREATE POLICY "subjects_select_auth" ON subjects FOR SELECT USING (true);
