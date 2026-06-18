-- 007_fix_recursion_final.sql

-- Create the function as postgres to ensure RLS bypass
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_adm boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  ) INTO is_adm;
  
  RETURN is_adm;
END;
$$;

-- Explicitly set owner to postgres so SECURITY DEFINER bypasses RLS
ALTER FUNCTION public.is_admin() OWNER TO postgres;
