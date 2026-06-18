-- 006_fix_recursion_plpgsql.sql

-- Create using plpgsql to strictly prevent SQL inlining
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
