-- supabase/migrations/025_database_formulas_and_streaks.sql
-- 1. Extend university_exam_configs with aggregate score parameters
ALTER TABLE public.university_exam_configs
  ADD COLUMN IF NOT EXISTS jamb_weight_percentage numeric(4,3) DEFAULT 0.500,
  ADD COLUMN IF NOT EXISTS post_utme_weight_percentage numeric(4,3) DEFAULT 0.500,
  ADD COLUMN IF NOT EXISTS olevel_weight_percentage numeric(4,3) DEFAULT 0.000,
  ADD COLUMN IF NOT EXISTS olevel_points_system text DEFAULT 'none' CHECK (olevel_points_system IN ('unilag', 'oau', 'none')),
  ADD COLUMN IF NOT EXISTS allow_double_sitting boolean DEFAULT true;

-- Update existing configs to make sure defaults are set (if any rows exist)
UPDATE public.university_exam_configs
SET 
  jamb_weight_percentage = COALESCE(jamb_weight_percentage, 0.500),
  post_utme_weight_percentage = COALESCE(post_utme_weight_percentage, 0.500),
  olevel_weight_percentage = COALESCE(olevel_weight_percentage, 0.000),
  olevel_points_system = COALESCE(olevel_points_system, 'none'),
  allow_double_sitting = COALESCE(allow_double_sitting, true);

-- Update seed or specific configurations for UNILAG, OAU, UI, UNIBEN if they exist
DO $$
DECLARE
    uni_unilag uuid;
    uni_oau uuid;
    uni_ui uuid;
    uni_uniben uuid;
BEGIN
    SELECT id INTO uni_unilag FROM public.universities WHERE short_name = 'UNILAG';
    SELECT id INTO uni_oau FROM public.universities WHERE short_name = 'OAU';
    SELECT id INTO uni_ui FROM public.universities WHERE short_name = 'UI';
    SELECT id INTO uni_uniben FROM public.universities WHERE short_name = 'UNIBEN';

    -- UNILAG Config: 50% JAMB, 30% Post-UTME, 20% O'Level, unilag points system, single sitting usually preferred or allowed but with rules
    IF uni_unilag IS NOT NULL THEN
        UPDATE public.university_exam_configs
        SET 
            jamb_weight_percentage = 0.500,
            post_utme_weight_percentage = 0.300,
            olevel_weight_percentage = 0.200,
            olevel_points_system = 'unilag',
            allow_double_sitting = false
        WHERE university_id = uni_unilag;
    END IF;

    -- OAU Config: 50% JAMB, 10% Post-UTME, 40% O'Level, oau points system, double sitting allowed
    IF uni_oau IS NOT NULL THEN
        UPDATE public.university_exam_configs
        SET 
            jamb_weight_percentage = 0.500,
            post_utme_weight_percentage = 0.100,
            olevel_weight_percentage = 0.400,
            olevel_points_system = 'oau',
            allow_double_sitting = true
        WHERE university_id = uni_oau;
    END IF;

    -- UI Config: 50% JAMB, 50% Post-UTME, 0% O'Level weight directly, double sitting allowed
    IF uni_ui IS NOT NULL THEN
        UPDATE public.university_exam_configs
        SET 
            jamb_weight_percentage = 0.500,
            post_utme_weight_percentage = 0.500,
            olevel_weight_percentage = 0.000,
            olevel_points_system = 'none',
            allow_double_sitting = true
        WHERE university_id = uni_ui;
    END IF;
END $$;


-- 2. Adjust daily streak calculation logic to target 'Africa/Lagos' timezone bounds

-- Update the activity tracker function to log the date in Africa/Lagos timezone
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lagos_date date;
BEGIN
  lagos_date := (timezone('Africa/Lagos', now()))::date;
  UPDATE public.profiles
  SET last_active_date = lagos_date
  WHERE id = auth.uid()
  AND (last_active_date IS NULL OR last_active_date != lagos_date);
  RETURN NEW;
END;
$$;

-- Update the get_user_streak function to calculate relative to Africa/Lagos timezone
CREATE OR REPLACE FUNCTION get_user_streak(user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  streak_count integer := 0;
  lagos_date date := (timezone('Africa/Lagos', now()))::date;
  last_active date;
BEGIN
  -- Get the user's last active date
  SELECT last_active_date INTO last_active
  FROM public.profiles
  WHERE id = user_id;
  
  -- If never active or last active is yesterday or older, return 0
  IF last_active IS NULL OR last_active < lagos_date - 1 THEN
    RETURN 0;
  END IF;
  
  -- If active today, start counting
  IF last_active = lagos_date THEN
    streak_count := 1;
    lagos_date := lagos_date - 1;
  END IF;
  
  -- Count consecutive days backwards
  WHILE EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id 
    AND last_active_date = lagos_date
  ) LOOP
    streak_count := streak_count + 1;
    lagos_date := lagos_date - 1;
  END LOOP;
  
  RETURN streak_count;
END;
$$;

-- Update the is_user_active_today function to use Africa/Lagos timezone
CREATE OR REPLACE FUNCTION is_user_active_today(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  last_active date;
  lagos_date date := (timezone('Africa/Lagos', now()))::date;
BEGIN
  SELECT last_active_date INTO last_active
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN last_active = lagos_date;
END;
$$;


-- 3. Extend get_admin_subscriptions() RPC to return payment_proof_url
CREATE OR REPLACE FUNCTION get_admin_subscriptions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',                s.id,
      'plan',              s.plan,
      'amount',            s.amount,
      'payment_reference', s.payment_reference,
      'payment_proof_url', s.payment_proof_url,
      'status',            s.status,
      'admin_notes',       s.admin_notes,
      'created_at',        s.created_at,
      'starts_at',         s.starts_at,
      'expires_at',        s.expires_at,
      'approved_at',       s.approved_at,
      'user_id',           s.user_id,
      'user_email',        p.email,
      'user_name',         p.full_name,
      'user_premium',      p.is_premium
    )
    ORDER BY s.created_at DESC
  )
  INTO result
  FROM subscriptions s
  LEFT JOIN profiles p ON p.id = s.user_id;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_subscriptions() TO authenticated;
