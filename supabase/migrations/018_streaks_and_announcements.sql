-- ==============================================================================
-- 018_streaks_and_announcements.sql
-- 1. Create announcements table
-- 2. Add last_active_date to profiles
-- ==============================================================================

-- ==============================================================================
-- 1. Create announcements table (with proper cleanup)
-- ==============================================================================

-- Drop existing table if it exists to start fresh
DROP TABLE IF EXISTS public.announcements CASCADE;

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "announcements_select_all" ON public.announcements;
DROP POLICY IF EXISTS "Only superadmins can manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "announcements_admin_all" ON public.announcements;

-- Create policies
CREATE POLICY "announcements_select_all"
  ON public.announcements FOR SELECT
  USING (true);

CREATE POLICY "announcements_admin_all"
  ON public.announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin'
    )
  );

-- Grant permissions
GRANT ALL ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;

-- ==============================================================================
-- 2. Add last_active_date to profiles for streak tracking
-- ==============================================================================

-- Add column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_date date;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_date ON public.profiles(last_active_date);

-- ==============================================================================
-- 3. Create streak tracking function
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_last_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_active_date = CURRENT_DATE
  WHERE id = auth.uid()
  AND (last_active_date IS NULL OR last_active_date != CURRENT_DATE);
  RETURN NEW;
END;
$$;

-- Create trigger for exam sessions to track activity
DROP TRIGGER IF EXISTS update_last_active_on_session ON public.exam_sessions;

CREATE TRIGGER update_last_active_on_session
  AFTER INSERT ON public.exam_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_last_active();

-- ==============================================================================
-- 4. Create function to get user streak
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_user_streak(user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  streak_count integer := 0;
  current_date_var date := CURRENT_DATE;
  last_active date;
BEGIN
  -- Get the user's last active date
  SELECT last_active_date INTO last_active
  FROM public.profiles
  WHERE id = user_id;
  
  -- If never active or last active is yesterday or older, return 0
  IF last_active IS NULL OR last_active < current_date_var - 1 THEN
    RETURN 0;
  END IF;
  
  -- If active today, start counting
  IF last_active = current_date_var THEN
    streak_count := 1;
    current_date_var := current_date_var - 1;
  END IF;
  
  -- Count consecutive days backwards
  WHILE EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id 
    AND last_active_date = current_date_var
  ) LOOP
    streak_count := streak_count + 1;
    current_date_var := current_date_var - 1;
  END LOOP;
  
  RETURN streak_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_streak(uuid) TO authenticated;

-- ==============================================================================
-- 5. Create function to get recent active users (for analytics)
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_active_users_count(days integer DEFAULT 7)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT user_id)
    FROM public.exam_sessions
    WHERE created_at >= NOW() - (days || ' days')::interval
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_users_count(integer) TO authenticated;

-- ==============================================================================
-- 6. Create function to get user's daily activity status
-- ==============================================================================

CREATE OR REPLACE FUNCTION is_user_active_today(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  last_active date;
BEGIN
  SELECT last_active_date INTO last_active
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN last_active = CURRENT_DATE;
END;
$$;

GRANT EXECUTE ON FUNCTION is_user_active_today(uuid) TO authenticated;

-- ==============================================================================
-- 7. Create function to get announcements with pagination
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_announcements(
  limit_count integer DEFAULT 10,
  offset_count integer DEFAULT 0
)
RETURNS SETOF public.announcements
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.announcements
  WHERE is_active = true
  ORDER BY priority DESC, created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_announcements(integer, integer) TO authenticated;

-- ==============================================================================
-- 8. Update existing profiles with initial last_active_date
-- ==============================================================================

UPDATE public.profiles
SET last_active_date = created_at::date
WHERE last_active_date IS NULL 
  AND created_at IS NOT NULL;

-- ==============================================================================
-- 9. Create stats function for announcements
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_announcements_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*) FROM public.announcements),
    'active', (SELECT COUNT(*) FROM public.announcements WHERE is_active = true),
    'inactive', (SELECT COUNT(*) FROM public.announcements WHERE is_active = false),
    'last_week', (SELECT COUNT(*) FROM public.announcements WHERE created_at >= NOW() - INTERVAL '7 days')
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_announcements_stats() TO authenticated;

-- ==============================================================================
-- 10. Add trigger to auto-update updated_at
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 11. Add sample announcement for testing (optional)
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.announcements LIMIT 1) THEN
    INSERT INTO public.announcements (title, message, priority)
    VALUES (
      'Welcome to PrepAI!',
      'Welcome to your exam preparation platform. Start practicing today!',
      10
    );
  END IF;
END;
$$;

-- ==============================================================================
-- 12. Log the changes
-- ==============================================================================

DO $$
DECLARE
  announcements_count int;
  profiles_with_streak int;
BEGIN
  SELECT COUNT(*) INTO announcements_count FROM public.announcements;
  SELECT COUNT(*) INTO profiles_with_streak FROM public.profiles WHERE last_active_date IS NOT NULL;
  
  RAISE NOTICE 'Migration complete. Announcements: %, Profiles with streak: %', 
    announcements_count, profiles_with_streak;
END;
$$;