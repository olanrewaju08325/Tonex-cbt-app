-- 010_drop_manual_policies.sql

-- Drop all old policies that were created manually (or via another tool) 
-- with human-readable names which contain the infinite recursion subquery.

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all universities" ON universities;
DROP POLICY IF EXISTS "Admins can modify universities" ON universities;
DROP POLICY IF EXISTS "Admins can view all subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can modify subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can view all questions" ON questions;
DROP POLICY IF EXISTS "Admins can modify questions" ON questions;
DROP POLICY IF EXISTS "Admins can view all exam sessions" ON exam_sessions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can modify all subscriptions" ON subscriptions;

