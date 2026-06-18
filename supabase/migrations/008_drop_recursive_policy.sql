-- 008_drop_recursive_policy.sql

-- Drop the policy that is causing the infinite recursion loop.
-- The is_admin() function queries the profiles table, which in turn triggers this policy,
-- which calls is_admin() again, causing an infinite loop.
-- By removing this policy, is_admin() will safely evaluate against profiles_select_own (auth.uid() = id) 
-- without recursing, and Admins can be granted access via RPC or a separate secure view if needed.

DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
