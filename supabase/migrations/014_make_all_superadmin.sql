-- ============================================================
-- 014_make_all_superadmin.sql
-- Grant all current users superadmin role for testing
-- ============================================================

UPDATE profiles SET role = 'superadmin';
