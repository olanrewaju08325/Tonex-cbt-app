-- 009_check_policies.sql

CREATE OR REPLACE FUNCTION public.get_all_policies()
RETURNS TABLE (
  schemaname name,
  tablename name,
  policyname name,
  qual text,
  with_check text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT schemaname, tablename, policyname, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public';
$$;
