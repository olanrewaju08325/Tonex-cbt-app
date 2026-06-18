-- 020_fix_admin_rls.sql
-- Grant full access to superadmins for universities and subjects

-- Subjects
DROP POLICY IF EXISTS "subjects_all_superadmin" ON subjects;
CREATE POLICY "subjects_all_superadmin" ON subjects
FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'superadmin')
) WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'superadmin')
);

-- Universities
DROP POLICY IF EXISTS "universities_all_superadmin" ON universities;
CREATE POLICY "universities_all_superadmin" ON universities
FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'superadmin')
) WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'superadmin')
);
