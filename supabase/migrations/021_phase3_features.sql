-- 021_phase3_features.sql
-- Phase 3: Badges, Peer Challenges, Exam Scheduling, Content Flagging, Admin Logs

-- ─────────────────────────────────────────
-- 1. USER BADGES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_slug text NOT NULL,
  badge_name text NOT NULL,
  badge_description text,
  badge_icon text DEFAULT '🏆',
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_slug)
);
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_badges_select" ON user_badges;
DROP POLICY IF EXISTS "user_badges_insert_superadmin" ON user_badges;
CREATE POLICY "user_badges_select" ON user_badges FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'superadmin'));
CREATE POLICY "user_badges_insert_superadmin" ON user_badges FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'superadmin'));

-- ─────────────────────────────────────────
-- 2. PEER CHALLENGES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_ids text[] NOT NULL,
  subject_id uuid REFERENCES subjects(id),
  expires_at timestamptz DEFAULT now() + INTERVAL '7 days',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "challenges_select" ON challenges;
DROP POLICY IF EXISTS "challenges_insert" ON challenges;
CREATE POLICY "challenges_select" ON challenges FOR SELECT USING (true);
CREATE POLICY "challenges_insert" ON challenges FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS challenge_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score_percentage numeric(5,2) NOT NULL DEFAULT 0,
  correct_answers int NOT NULL DEFAULT 0,
  total_questions int NOT NULL DEFAULT 0,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);
ALTER TABLE challenge_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "challenge_results_all" ON challenge_results;
CREATE POLICY "challenge_results_all" ON challenge_results FOR ALL USING (true) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 3. EXAM SCHEDULES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject_id uuid REFERENCES subjects(id),
  scheduled_at timestamptz NOT NULL,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exam_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exam_schedules_all" ON exam_schedules;
CREATE POLICY "exam_schedules_all" ON exam_schedules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 4. QUESTION FLAGS (content flagging)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'fixed', 'dismissed')),
  admin_note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(question_id, user_id)
);
ALTER TABLE question_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "question_flags_select_admin" ON question_flags;
DROP POLICY IF EXISTS "question_flags_insert_auth" ON question_flags;
DROP POLICY IF EXISTS "question_flags_update_admin" ON question_flags;
CREATE POLICY "question_flags_select_admin" ON question_flags FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'superadmin'));
CREATE POLICY "question_flags_insert_auth" ON question_flags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "question_flags_update_admin" ON question_flags FOR UPDATE USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'superadmin'));

-- ─────────────────────────────────────────
-- 5. ADMIN ACTIVITY LOGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_logs_superadmin" ON admin_logs;
CREATE POLICY "admin_logs_superadmin" ON admin_logs FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'superadmin'));
