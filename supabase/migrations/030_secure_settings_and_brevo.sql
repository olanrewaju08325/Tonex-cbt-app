-- 030_secure_settings_and_brevo.sql
-- 1. Drop the overly permissive public select policy
DROP POLICY IF EXISTS "site_settings_read" ON public.site_settings;

-- 2. Recreate a secure policy that filters out sensitive keys for non-admins
CREATE POLICY "site_settings_read" ON public.site_settings 
FOR SELECT 
USING (key NOT IN ('brevo_api_key', 'paystack_secret_key'));
