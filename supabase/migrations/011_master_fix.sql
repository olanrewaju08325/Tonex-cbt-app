-- ============================================================
-- 011_master_fix.sql
-- Comprehensive fix: dedup universities, new tables, fix RLS,
-- fix DB functions, grant superadmin, all RPC functions
-- ============================================================

-- ============================================================
-- 1. FORCE SUPERADMIN ROLE (fix the access denied issue)
-- ============================================================
UPDATE profiles SET role = 'superadmin' WHERE email = 'obianombenedict@gmail.com';

-- ============================================================
-- 2. DEDUPLICATE UNIVERSITIES (keep the one with latest created_at)
-- ============================================================
DELETE FROM universities a
USING universities b
WHERE a.name = b.name
  AND a.created_at < b.created_at;

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'universities_name_unique'
  ) THEN
    ALTER TABLE universities ADD CONSTRAINT universities_name_unique UNIQUE (name);
  END IF;
END;
$$;

-- ============================================================
-- 3. FIX get_user_stats — return zeros when no sessions exist
-- ============================================================
DROP FUNCTION IF EXISTS get_user_stats(uuid);
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id uuid)
RETURNS TABLE (
  tests_taken bigint,
  avg_score numeric,
  correct_answers bigint,
  total_questions bigint,
  streak_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      COALESCE(COUNT(s.id), 0)::bigint AS tests_taken,
      COALESCE(ROUND(AVG(s.score_percentage), 1), 0)::numeric AS avg_score,
      COALESCE(SUM(s.correct_answers), 0)::bigint AS correct_answers,
      COALESCE(SUM(s.total_questions), 0)::bigint AS total_questions,
      COALESCE(p.streak_count, 0) AS streak_count
    FROM profiles p
    LEFT JOIN exam_sessions s ON s.user_id = p.id
    WHERE p.id = p_user_id
    GROUP BY p.streak_count;
END;
$$;

-- ============================================================
-- 4. FIX questions table: add correct_option alias column
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'correct_option'
  ) THEN
    ALTER TABLE questions ADD COLUMN correct_option char(1)
      CHECK (correct_option IN ('A','B','C','D'));
  END IF;
END;
$$;
-- Sync existing data
UPDATE questions SET correct_option = correct_answer WHERE correct_option IS NULL;

-- Create trigger to keep them in sync
CREATE OR REPLACE FUNCTION sync_correct_answer()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.correct_answer IS NOT NULL AND NEW.correct_option IS NULL THEN
    NEW.correct_option := NEW.correct_answer;
  ELSIF NEW.correct_option IS NOT NULL AND NEW.correct_answer IS NULL THEN
    NEW.correct_answer := NEW.correct_option;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_correct_answer ON questions;
CREATE TRIGGER trg_sync_correct_answer
  BEFORE INSERT OR UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION sync_correct_answer();

-- ============================================================
-- 5. CREATE university_exam_configs TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS university_exam_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid REFERENCES universities(id) ON DELETE CASCADE UNIQUE,
  num_subjects int DEFAULT 4,
  num_questions_per_subject int DEFAULT 20,
  time_limit_minutes int DEFAULT 60,
  is_english_compulsory boolean DEFAULT true,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

-- university_exam_config_subjects: which subjects are allowed per university
CREATE TABLE IF NOT EXISTS university_exam_config_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid REFERENCES university_exam_configs(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  is_compulsory boolean DEFAULT false,
  UNIQUE (config_id, subject_id)
);

-- Enable RLS
ALTER TABLE university_exam_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_exam_config_subjects ENABLE ROW LEVEL SECURITY;

-- Policies: anyone can read, admins can write
DROP POLICY IF EXISTS "exam_configs_read" ON university_exam_configs;
DROP POLICY IF EXISTS "exam_configs_write_admin" ON university_exam_configs;
CREATE POLICY "exam_configs_read" ON university_exam_configs FOR SELECT USING (true);
CREATE POLICY "exam_configs_write_admin" ON university_exam_configs FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "exam_config_subjects_read" ON university_exam_config_subjects;
DROP POLICY IF EXISTS "exam_config_subjects_write_admin" ON university_exam_config_subjects;
CREATE POLICY "exam_config_subjects_read" ON university_exam_config_subjects FOR SELECT USING (true);
CREATE POLICY "exam_config_subjects_write_admin" ON university_exam_config_subjects FOR ALL USING (is_admin());

-- ============================================================
-- 6. CREATE notifications TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info','success','warning','promo','exam')),
  is_read boolean DEFAULT false,
  action_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_admin_insert" ON notifications;
CREATE POLICY "notifications_admin_insert" ON notifications FOR INSERT WITH CHECK (is_admin());

-- ============================================================
-- 7. CREATE notification_preferences TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT false,
  exam_reminders boolean DEFAULT true,
  promo_emails boolean DEFAULT true,
  weekly_report boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_prefs_own" ON notification_preferences;
CREATE POLICY "notif_prefs_own" ON notification_preferences FOR ALL USING (auth.uid() = user_id);

-- Auto-create notification preferences on signup
CREATE OR REPLACE FUNCTION handle_new_user_preferences()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_preferences();

-- ============================================================
-- 8. CREATE site_settings TABLE (for superadmin content management)
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_read" ON site_settings;
DROP POLICY IF EXISTS "site_settings_write_superadmin" ON site_settings;
CREATE POLICY "site_settings_read" ON site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings_write_superadmin" ON site_settings FOR ALL USING (is_admin());

-- Seed default site settings
INSERT INTO site_settings (key, value) VALUES
('pricing_plans', '[
  {
    "id": "free",
    "name": "Free",
    "price": 0,
    "price_display": "Free",
    "period": "forever",
    "features": ["10 questions per subject per day", "Basic analytics", "Leaderboard access"],
    "is_highlighted": false
  },
  {
    "id": "monthly",
    "name": "Monthly",
    "price": 1500,
    "price_display": "₦1,500",
    "period": "per month",
    "features": ["Unlimited questions", "All universities", "Full CBT exam mode", "Advanced analytics", "Priority support"],
    "is_highlighted": false
  },
  {
    "id": "quarterly",
    "name": "Quarterly",
    "price": 3500,
    "price_display": "₦3,500",
    "period": "per 3 months",
    "features": ["Everything in Monthly", "Save 22%", "Offline mode (coming soon)", "Study groups (coming soon)"],
    "is_highlighted": true
  },
  {
    "id": "yearly",
    "name": "Yearly",
    "price": 9000,
    "price_display": "₦9,000",
    "period": "per year",
    "features": ["Everything in Quarterly", "Save 50%", "1-on-1 mentoring session", "Exclusive community access"],
    "is_highlighted": false
  }
]'::jsonb),
('hero_text', '{
  "headline": "Ace Your Post-UTME",
  "subheadline": "Practice with 15,000+ verified past questions from 50+ Nigerian universities",
  "cta_primary": "Start Practicing Free",
  "cta_secondary": "See How It Works"
}'::jsonb),
('payment_info', '{
  "bank": "Moniepoint",
  "account_number": "6017722053",
  "account_name": "BENEDICT CHIDALU OBIANOM",
  "instructions": "Make transfer and send proof of payment to our WhatsApp number. Your account will be activated within 24 hours."
}'::jsonb),
('contact_info', '{
  "whatsapp": "+2348000000000",
  "email": "support@tonexcbt.com",
  "twitter": "@tonexcbt"
}'::jsonb),
('faq', '[
  {"q": "How do I access my university past questions?", "a": "Select your university in Practice Mode and the system will filter questions specifically for that institution."},
  {"q": "Is there a free trial?", "a": "Yes! The free plan gives you 10 questions per subject per day with no credit card required."},
  {"q": "How do I upgrade to Premium?", "a": "Go to the Premium page, choose your plan, and make a bank transfer. Your account activates within 24 hours."},
  {"q": "Can I use Tonex CBT on my phone?", "a": "Yes, Tonex CBT is fully mobile-responsive and can be installed as an app on your phone."}
]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 9. UPSERT function for site_settings (superadmin use)
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_site_setting(p_key text, p_value jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO site_settings (key, value, updated_by, updated_at)
  VALUES (p_key, p_value, auth.uid(), now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();
END;
$$;

-- ============================================================
-- 10. RPC: get_university_exam_config
-- ============================================================
CREATE OR REPLACE FUNCTION get_university_exam_config(p_university_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'config', row_to_json(c),
    'subjects', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'subject_id', cs.subject_id,
        'subject_name', s.name,
        'is_compulsory', cs.is_compulsory
      ))
      FROM university_exam_config_subjects cs
      JOIN subjects s ON s.id = cs.subject_id
      WHERE cs.config_id = c.id),
      '[]'::jsonb
    )
  )
  INTO result
  FROM university_exam_configs c
  WHERE c.university_id = p_university_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- ============================================================
-- 11. RPC: mark_notifications_read
-- ============================================================
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications SET is_read = true
  WHERE user_id = p_user_id AND is_read = false;
END;
$$;

-- ============================================================
-- 12. Insert welcome notification for existing users
-- ============================================================
INSERT INTO notifications (user_id, title, body, type)
SELECT id, 'Welcome to Tonex CBT! 🎉', 
  'Start practicing with thousands of past questions from your university. Good luck!', 
  'success'
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM notifications n WHERE n.user_id = profiles.id
);

-- ============================================================
-- 13. ENSURE profiles policy allows admins to read all (non-recursive)
-- ============================================================
-- This uses is_admin() which is SECURITY DEFINER so no recursion
DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update_all" ON profiles;
CREATE POLICY "profiles_admin_select_all" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "profiles_admin_update_all" ON profiles FOR UPDATE USING (is_admin());

-- Ensure anon can read universities (needed for registration)
DROP POLICY IF EXISTS "unis_select_anon" ON universities;
CREATE POLICY "unis_select_anon" ON universities FOR SELECT TO anon USING (is_active = true);

-- ============================================================
-- 14. Admin aggregate function for stats dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'premium_users', (SELECT COUNT(*) FROM profiles WHERE is_premium = true),
    'total_questions', (SELECT COUNT(*) FROM questions WHERE is_published = true),
    'total_universities', (SELECT COUNT(*) FROM universities WHERE is_active = true),
    'total_sessions', (SELECT COUNT(*) FROM exam_sessions),
    'new_today', (SELECT COUNT(*) FROM profiles WHERE created_at::date = CURRENT_DATE),
    'revenue', (SELECT COALESCE(SUM(amount), 0) FROM subscriptions WHERE status = 'active')
  ) INTO result;
  
  RETURN result;
END;
$$;
