-- 002_ensure_tables.sql
-- Safe idempotent migration to ensure all tables exist
-- Run this directly in the Supabase SQL Editor if 001 partially failed

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- universities
CREATE TABLE IF NOT EXISTS universities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    short_name text NOT NULL,
    state text,
    logo_url text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- subjects
CREATE TABLE IF NOT EXISTS subjects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- questions
CREATE TABLE IF NOT EXISTS questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id uuid REFERENCES universities(id) ON DELETE SET NULL,
    subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
    text text NOT NULL,
    image_url text,
    option_a text,
    option_b text,
    option_c text,
    option_d text,
    correct_answer char(1) CHECK (correct_answer IN ('A','B','C','D')),
    explanation text,
    reference text,
    year int,
    is_published boolean DEFAULT false,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- exam_sessions
CREATE TABLE IF NOT EXISTS exam_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    university_id uuid REFERENCES universities(id) ON DELETE SET NULL,
    subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
    mode text,
    total_questions int,
    correct_answers int,
    score_percentage numeric,
    time_taken_seconds int,
    completed_at timestamptz DEFAULT now()
);

-- exam_answers
CREATE TABLE IF NOT EXISTS exam_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES exam_sessions(id) ON DELETE CASCADE,
    question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
    selected_answer char(1),
    is_correct boolean
);

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    plan text CHECK (plan IN ('monthly','quarterly','yearly','manual')),
    payment_reference text,
    payment_proof_url text,
    status text DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled')),
    amount numeric,
    starts_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, question_id)
);

-- daily_usage
CREATE TABLE IF NOT EXISTS daily_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
    usage_date date DEFAULT CURRENT_DATE,
    questions_answered int DEFAULT 0,
    UNIQUE (user_id, subject_id, usage_date)
);

-- Add FK on profiles if not already there
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_target_university'
      AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT fk_target_university
      FOREIGN KEY (target_university_id) REFERENCES universities(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================
-- Enable RLS
-- =====================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;

-- =====================
-- RLS Policies (drop first to avoid conflicts, then recreate)
-- =====================

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_select_all" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

-- universities (read for all auth, write for admins)
DROP POLICY IF EXISTS "unis_select_auth" ON universities;
DROP POLICY IF EXISTS "unis_write_admin" ON universities;
CREATE POLICY "unis_select_auth" ON universities FOR SELECT USING (true);
CREATE POLICY "unis_write_admin" ON universities FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

-- subjects
DROP POLICY IF EXISTS "subjects_select_auth" ON subjects;
DROP POLICY IF EXISTS "subjects_write_admin" ON subjects;
CREATE POLICY "subjects_select_auth" ON subjects FOR SELECT USING (true);
CREATE POLICY "subjects_write_admin" ON subjects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

-- questions: published for all auth, full access for admins
DROP POLICY IF EXISTS "questions_select_published" ON questions;
DROP POLICY IF EXISTS "questions_admin_all" ON questions;
CREATE POLICY "questions_select_published" ON questions FOR SELECT USING (
  is_published = true AND auth.role() = 'authenticated'
);
CREATE POLICY "questions_admin_all" ON questions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

-- exam_sessions
DROP POLICY IF EXISTS "sessions_own" ON exam_sessions;
CREATE POLICY "sessions_own" ON exam_sessions FOR ALL USING (auth.uid() = user_id);

-- exam_answers
DROP POLICY IF EXISTS "answers_own" ON exam_answers;
CREATE POLICY "answers_own" ON exam_answers FOR ALL USING (
  EXISTS (SELECT 1 FROM exam_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
);

-- subscriptions
DROP POLICY IF EXISTS "subs_own_select" ON subscriptions;
DROP POLICY IF EXISTS "subs_insert_own" ON subscriptions;
DROP POLICY IF EXISTS "subs_admin_all" ON subscriptions;
CREATE POLICY "subs_own_select" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subs_insert_own" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subs_admin_all" ON subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

-- bookmarks
DROP POLICY IF EXISTS "bookmarks_own" ON bookmarks;
CREATE POLICY "bookmarks_own" ON bookmarks FOR ALL USING (auth.uid() = user_id);

-- daily_usage
DROP POLICY IF EXISTS "usage_own" ON daily_usage;
CREATE POLICY "usage_own" ON daily_usage FOR ALL USING (auth.uid() = user_id);

-- =====================
-- Triggers
-- =====================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update is_premium when subscription status changes
CREATE OR REPLACE FUNCTION handle_subscription_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE profiles SET is_premium = true, premium_expires_at = NEW.expires_at
    WHERE id = NEW.user_id;
  ELSIF NEW.status IN ('expired','cancelled') THEN
    UPDATE profiles SET is_premium = false, premium_expires_at = NULL
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscription_change ON subscriptions;
CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_subscription_change();

-- =====================
-- Database Functions
-- =====================

DROP FUNCTION IF EXISTS get_leaderboard(uuid);
CREATE OR REPLACE FUNCTION get_leaderboard(p_university_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid, full_name text, university_short_name text,
  avg_score numeric, total_exams bigint
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
    SELECT
      p.id AS user_id,
      p.full_name,
      u.short_name AS university_short_name,
      ROUND(AVG(s.score_percentage), 1) AS avg_score,
      COUNT(s.id) AS total_exams
    FROM profiles p
    JOIN exam_sessions s ON s.user_id = p.id
    LEFT JOIN universities u ON u.id = p.target_university_id
    WHERE (p_university_id IS NULL OR p.target_university_id = p_university_id)
    GROUP BY p.id, p.full_name, u.short_name
    HAVING COUNT(s.id) >= 1
    ORDER BY avg_score DESC
    LIMIT 100;
END;
$$;

DROP FUNCTION IF EXISTS get_user_stats(uuid);
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id uuid)
RETURNS TABLE (
  tests_taken bigint, avg_score numeric,
  correct_answers bigint, total_questions bigint, streak_count int
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
    SELECT
      COUNT(s.id) AS tests_taken,
      ROUND(AVG(s.score_percentage), 1) AS avg_score,
      SUM(s.correct_answers)::bigint AS correct_answers,
      SUM(s.total_questions)::bigint AS total_questions,
      p.streak_count
    FROM exam_sessions s
    JOIN profiles p ON p.id = s.user_id
    WHERE s.user_id = p_user_id
    GROUP BY p.streak_count;
END;
$$;

DROP FUNCTION IF EXISTS increment_daily_usage(uuid, uuid, int);
CREATE OR REPLACE FUNCTION increment_daily_usage(p_user_id uuid, p_subject_id uuid, p_count int)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO daily_usage (user_id, subject_id, usage_date, questions_answered)
  VALUES (p_user_id, p_subject_id, CURRENT_DATE, p_count)
  ON CONFLICT (user_id, subject_id, usage_date)
  DO UPDATE SET questions_answered = daily_usage.questions_answered + p_count;
END;
$$;

-- =====================
-- Superadmin grant
-- =====================
UPDATE profiles SET role = 'superadmin' WHERE email = 'obianombenedict@gmail.com';
