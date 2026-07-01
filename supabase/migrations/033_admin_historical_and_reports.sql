-- 033_admin_historical_and_reports.sql

-- 1. Create grant_pwa_badge function
CREATE OR REPLACE FUNCTION public.grant_pwa_badge()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User is not authenticated';
  END IF;

  -- Insert the PWA install badge
  INSERT INTO public.user_badges (user_id, badge_slug, badge_name, badge_icon, badge_description, earned_at)
  VALUES (
    auth.uid(),
    'mobile_pioneer',
    'Mobile Pioneer',
    '📱',
    'Installed the Tonex CBT mobile application on home screen.',
    now()
  )
  ON CONFLICT (user_id, badge_slug) DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_pwa_badge() TO authenticated;


-- 2. Recreate get_admin_stats to include DAU (active_today)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Verify requester is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can query stats.';
  END IF;

  SELECT jsonb_build_object(
    'total_users',        (SELECT COUNT(*) FROM profiles),
    'premium_users',      (SELECT COUNT(*) FROM profiles WHERE is_premium = true),
    'total_questions',    (SELECT COUNT(*) FROM questions WHERE is_published = true),
    'total_universities', (SELECT COUNT(*) FROM universities WHERE is_active = true),
    'total_sessions',     (SELECT COUNT(*) FROM exam_sessions),
    'new_today',          (SELECT COUNT(*) FROM profiles WHERE created_at::date = CURRENT_DATE),
    'revenue',            (SELECT COALESCE(SUM(amount), 0) FROM subscriptions WHERE status IN ('active', 'expired')),
    'active_today',       (SELECT COUNT(DISTINCT user_id) FROM exam_sessions WHERE completed_at::date = CURRENT_DATE)
  ) INTO result;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- 3. Add target_department column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_department text;

-- 4. Recreate leaderboard functions returning target_department
DROP FUNCTION IF EXISTS public.get_leaderboard(uuid);
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_university_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid, full_name text, university_short_name text,
  avg_score numeric, total_exams bigint, target_department text
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
    SELECT
      p.id AS user_id,
      p.full_name,
      u.short_name AS university_short_name,
      ROUND(AVG(s.score_percentage), 1) AS avg_score,
      COUNT(s.id) AS total_exams,
      p.target_department
    FROM public.profiles p
    JOIN public.exam_sessions s ON s.user_id = p.id
    LEFT JOIN public.universities u ON u.id = p.target_university_id
    WHERE (p_university_id IS NULL OR p.target_university_id = p_university_id)
    GROUP BY p.id, p.full_name, u.short_name, p.target_department
    HAVING COUNT(s.id) >= 1
    ORDER BY avg_score DESC
    LIMIT 100;
END;
$$;

DROP FUNCTION IF EXISTS public.get_weekly_leaderboard(uuid);
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(p_university_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid, full_name text, university_short_name text,
  avg_score numeric, total_exams bigint, target_department text
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
    SELECT
      p.id AS user_id,
      p.full_name,
      u.short_name AS university_short_name,
      ROUND(AVG(s.score_percentage), 1) AS avg_score,
      COUNT(s.id) AS total_exams,
      p.target_department
    FROM public.profiles p
    JOIN public.exam_sessions s ON s.user_id = p.id
    LEFT JOIN public.universities u ON u.id = p.target_university_id
    WHERE (p_university_id IS NULL OR p.target_university_id = p_university_id)
      AND s.completed_at >= NOW() - INTERVAL '7 days'
    GROUP BY p.id, p.full_name, u.short_name, p.target_department
    HAVING COUNT(s.id) >= 1
    ORDER BY avg_score DESC
    LIMIT 100;
END;
$$;
