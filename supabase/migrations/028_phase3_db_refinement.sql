-- Phase 3 refinement: Strict RLS on User Badges, Questions Table Denormalization, and Cutoff Mark Admin Logs Trigger

-- 1. STRICT RLS ON USER BADGES
-- Drop existing policies
DROP POLICY IF EXISTS "user_badges_select" ON user_badges;
DROP POLICY IF EXISTS "user_badges_insert_superadmin" ON user_badges;

-- Enable RLS (just in case)
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Standard users can only read their own badges; superadmins can read all.
CREATE POLICY "user_badges_select" ON user_badges 
  FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'superadmin'));

-- Only superadmins can write directly (regular users cannot insert/update/delete via client side).
CREATE POLICY "user_badges_write_superadmin" ON user_badges 
  FOR ALL 
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'superadmin'));


-- 2. QUESTIONS TABLE DENORMALIZATION
-- Add denormalized columns to questions table if they don't exist
ALTER TABLE questions ADD COLUMN IF NOT EXISTS subject_name text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS university_name text;

-- Populate existing questions with denormalized values
UPDATE questions q
SET subject_name = s.name
FROM subjects s
WHERE q.subject_id = s.id;

UPDATE questions q
SET university_name = u.name
FROM universities u
WHERE q.university_id = u.id;

-- Create or replace trigger function to auto-populate fields on INSERT or UPDATE
CREATE OR REPLACE FUNCTION populate_question_denormalized_fields()
RETURNS trigger AS $$
BEGIN
  IF NEW.subject_id IS NOT NULL THEN
    SELECT name INTO NEW.subject_name FROM subjects WHERE id = NEW.subject_id;
  ELSE
    NEW.subject_name := NULL;
  END IF;

  IF NEW.university_id IS NOT NULL THEN
    SELECT name INTO NEW.university_name FROM universities WHERE id = NEW.university_id;
  ELSE
    NEW.university_name := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update denormalized subject/university names when a question is saved
DROP TRIGGER IF EXISTS questions_denormalized_fields_trigger ON questions;
CREATE TRIGGER questions_denormalized_fields_trigger
  BEFORE INSERT OR UPDATE OF subject_id, university_id ON questions
  FOR EACH ROW
  EXECUTE FUNCTION populate_question_denormalized_fields();


-- 3. CUT-OFF MARKS TRIGGER FOR ADMIN ACTIVITY LOGS
-- Create or replace function to auto-log changes on university_cut_off_marks
CREATE OR REPLACE FUNCTION log_cutoff_marks_activity()
RETURNS trigger AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Retrieve the authenticated user ID (admin making the change)
  v_admin_id := auth.uid();
  
  -- If v_admin_id is null, it might be database migrations/seeding, we can skip or default
  IF v_admin_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (
      v_admin_id,
      'CREATE_CUTOFF',
      'cutoff_mark',
      NEW.id::text,
      jsonb_build_object(
        'university_id', NEW.university_id,
        'department', NEW.department,
        'year', NEW.year,
        'cutoff_aggregate', NEW.cutoff_aggregate
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (
      v_admin_id,
      'UPDATE_CUTOFF',
      'cutoff_mark',
      NEW.id::text,
      jsonb_build_object(
        'old_cutoff_aggregate', OLD.cutoff_aggregate,
        'new_cutoff_aggregate', NEW.cutoff_aggregate,
        'department', NEW.department,
        'year', NEW.year
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (
      v_admin_id,
      'DELETE_CUTOFF',
      'cutoff_mark',
      OLD.id::text,
      jsonb_build_object(
        'university_id', OLD.university_id,
        'department', OLD.department,
        'year', OLD.year,
        'cutoff_aggregate', OLD.cutoff_aggregate
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute after changes on university_cut_off_marks table
DROP TRIGGER IF EXISTS cutoff_marks_activity_trigger ON public.university_cut_off_marks;
CREATE TRIGGER cutoff_marks_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.university_cut_off_marks
  FOR EACH ROW
  EXECUTE FUNCTION log_cutoff_marks_activity();
