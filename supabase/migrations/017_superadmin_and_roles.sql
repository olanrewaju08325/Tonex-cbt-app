-- ==============================================================================
-- 017_superadmin_and_roles.sql
-- 1. Create notification_preferences table
-- 2. Consolidate roles: remove 'admin', map to 'superadmin'
-- 3. Hardcode the superadmin user into auth.users so login works instantly
-- ==============================================================================

-- ==============================================================================
-- 1. Create notification_preferences table (with proper cleanup)
-- ==============================================================================

-- Drop existing table if it exists to start fresh
DROP TABLE IF EXISTS public.notification_preferences CASCADE;

CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  exam_reminders boolean DEFAULT true,
  promo_emails boolean DEFAULT false,
  weekly_report boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notification prefs" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification prefs" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification prefs" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_select_own" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update_own" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert_own" ON public.notification_preferences;

-- Create policies
CREATE POLICY "notification_preferences_select_own"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences_update_own"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences_insert_own"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

-- ==============================================================================
-- 2. Simplify Roles: Update anyone who is 'admin' to 'superadmin'
-- ==============================================================================

-- Update existing admins to superadmin
UPDATE public.profiles SET role = 'superadmin' WHERE role = 'admin';

-- Drop any previous check constraint if it exists and add the new one
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'superadmin'));

-- ==============================================================================
-- 3. Insert Superadmin User directly into auth.users securely
-- ==============================================================================

DO $$
DECLARE
  superadmin_id uuid := '8cd362d2-760f-41ed-853e-bc1fbf74f3e6';
  superadmin_email text := 'obianombenedict@gmail.com';
  superadmin_pass text := '22678721a@67';
  user_exists boolean;
  profile_exists boolean;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE email = superadmin_email) INTO user_exists;
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE email = superadmin_email) INTO profile_exists;
  
  IF NOT user_exists THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      superadmin_id,
      'authenticated',
      'authenticated',
      superadmin_email,
      crypt(superadmin_pass, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', 'Super Admin'),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
    
    -- Insert or update profile
    INSERT INTO public.profiles (id, email, full_name, role, is_premium)
    VALUES (superadmin_id, superadmin_email, 'Super Admin', 'superadmin', true)
    ON CONFLICT (id) DO UPDATE SET 
      role = 'superadmin',
      is_premium = true,
      full_name = 'Super Admin';
      
  ELSE
    -- User exists, ensure they're superadmin in profiles
    IF profile_exists THEN
      UPDATE public.profiles 
      SET role = 'superadmin', 
          is_premium = true,
          full_name = 'Super Admin'
      WHERE email = superadmin_email;
    ELSE
      -- Profile doesn't exist but auth user does
      INSERT INTO public.profiles (id, email, full_name, role, is_premium)
      SELECT id, email, 'Super Admin', 'superadmin', true
      FROM auth.users
      WHERE email = superadmin_email
      ON CONFLICT (id) DO UPDATE SET 
        role = 'superadmin',
        is_premium = true,
        full_name = 'Super Admin';
    END IF;
  END IF;
END;
$$;

-- ==============================================================================
-- 4. Update is_admin() function to use new role structure
-- ==============================================================================

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
      AND role = 'superadmin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ==============================================================================
-- 5. Create notification trigger for new users
-- ==============================================================================

CREATE OR REPLACE FUNCTION create_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_notification_preferences_trigger ON public.profiles;

CREATE TRIGGER create_notification_preferences_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_preferences();

-- ==============================================================================
-- 6. Verify and fix any existing issues
-- ==============================================================================

-- Ensure all users have notification preferences
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- ==============================================================================
-- 7. Create admin helper functions
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN COALESCE(user_role, 'user');
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;

-- ==============================================================================
-- 8. Indexes for performance
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- ==============================================================================
-- 9. Log the changes
-- ==============================================================================

DO $$
DECLARE
  superadmin_count int;
BEGIN
  SELECT COUNT(*) INTO superadmin_count FROM public.profiles WHERE role = 'superadmin';
  RAISE NOTICE 'Migration complete. Number of superadmins: %', superadmin_count;
END;
$$;