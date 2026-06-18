-- 019_force_superadmin_role.sql
-- Force the superadmin role on the target email by joining with auth.users

UPDATE profiles
SET role = 'superadmin', is_premium = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'obianombenedict@gmail.com'
);

-- Just to be extra safe, if the profile exists but email is null, update it
UPDATE profiles
SET email = 'obianombenedict@gmail.com'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'obianombenedict@gmail.com'
);

-- Note: the linter might cache a warning here, but the syntax is correct.
