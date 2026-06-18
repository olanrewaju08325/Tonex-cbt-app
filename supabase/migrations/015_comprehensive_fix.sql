-- ============================================================
-- 015_comprehensive_fix.sql
-- Fix ALL broken panels:
-- 1. Create is_admin() SECURITY DEFINER (fixes recursion)
-- 2. Nuke & recreate all broken RLS policies
-- 3. Fix subscriptions foreign key to profile (not auth.users)
-- 4. Ensure admin can always read all data
-- ============================================================

-- ============================================================
-- 1. CREATE is_admin() helper (SECURITY DEFINER avoids recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
  );
END;
$$;

-- ============================================================
-- 2. FIX profiles RLS — nuke ALL old policies, recreate cleanly
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;

-- Enable RLS on profiles (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Own: read & update your own profile
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
-- Self-insert on signup
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- Admin: read ALL profiles (uses SECURITY DEFINER fn — no recursion)
CREATE POLICY "profiles_admin_select" ON profiles FOR SELECT USING (is_admin());
-- Admin: update ANY profile (for role/premium management)
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE USING (is_admin());

-- ============================================================
-- 3. FIX subscriptions RLS — allow admins full access
-- ============================================================
DROP POLICY IF EXISTS "subs_own_select" ON subscriptions;
DROP POLICY IF EXISTS "subs_insert_own" ON subscriptions;
DROP POLICY IF EXISTS "subs_admin_all" ON subscriptions;
DROP POLICY IF EXISTS "subs_update_own" ON subscriptions;

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subs_own_select" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subs_insert_own" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subs_update_own" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);
-- Admin sees & modifies ALL subscriptions
CREATE POLICY "subs_admin_all" ON subscriptions FOR ALL USING (is_admin());

-- ============================================================
-- 4. FIX questions RLS
-- ============================================================
DROP POLICY IF EXISTS "questions_select_published" ON questions;
DROP POLICY IF EXISTS "questions_admin_all" ON questions;

-- Enable RLS on questions
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questions_select_published" ON questions FOR SELECT USING (
  is_published = true
);
CREATE POLICY "questions_admin_all" ON questions FOR ALL USING (is_admin());

-- ============================================================
-- 5. FIX exam_sessions RLS — admin can view all (for analytics)
-- ============================================================
DROP POLICY IF EXISTS "sessions_own" ON exam_sessions;
DROP POLICY IF EXISTS "sessions_admin_all" ON exam_sessions;

-- Enable RLS on exam_sessions
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_own" ON exam_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sessions_admin_all" ON exam_sessions FOR SELECT USING (is_admin());

-- ============================================================
-- 6. ADD profile_id column alias on subscriptions for clean joins
--    (subscriptions.user_id → profiles.id, same value)
--    So we can SELECT profiles directly in Supabase client
-- ============================================================
-- Nothing to add structurally; the fix is on the frontend join syntax.
-- (see ManualSubscriptionsView.tsx fix below)

-- ============================================================
-- 7. Ensure is_admin() is accessible to authenticated role
-- ============================================================
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ============================================================
-- 8. Ensure admin stats RPC exists and returns correctly
-- ============================================================
DROP FUNCTION IF EXISTS get_admin_stats();

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_users',        (SELECT COUNT(*) FROM profiles),
    'premium_users',      (SELECT COUNT(*) FROM profiles WHERE is_premium = true),
    'total_questions',    (SELECT COUNT(*) FROM questions WHERE is_published = true),
    'total_universities', (SELECT COUNT(*) FROM universities WHERE is_active = true),
    'total_sessions',     (SELECT COUNT(*) FROM exam_sessions),
    'new_today',          (SELECT COUNT(*) FROM profiles WHERE created_at::date = CURRENT_DATE),
    'revenue',            (SELECT COALESCE(SUM(amount), 0) FROM subscriptions WHERE status = 'active')
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;

-- ============================================================
-- 9. Ensure superadmin is set for the owner
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE email = 'obianombenedict@gmail.com') THEN
    UPDATE profiles 
    SET role = 'superadmin' 
    WHERE email = 'obianombenedict@gmail.com';
  END IF;
END;
$$;

-- ============================================================
-- 10. Additional fixes for common issues
-- ============================================================

-- Ensure profiles has the correct columns
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Ensure subscriptions has necessary columns
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'inactive';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON profiles(is_premium);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_questions_is_published ON questions(is_published);