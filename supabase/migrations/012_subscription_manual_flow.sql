-- ============================================================
-- 012_subscription_manual_flow.sql
-- Improve subscriptions table for manual approval workflow:
-- add admin_notes column, update status check constraint,
-- add questions.year column, fix RLS for admin subscription reads
-- ============================================================

-- 1. Add admin_notes column to subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN admin_notes text;
  END IF;
END;
$$;

-- 2. Add approved_by column to subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN approved_by uuid REFERENCES auth.users(id);
  END IF;
END;
$$;

-- 3. Add approved_at column to subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN approved_at timestamptz;
  END IF;
END;
$$;

-- 4. Fix the status CHECK constraint to allow all needed states
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('pending', 'active', 'expired', 'cancelled'));

-- 5. Add questions.year column if not yet present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'year'
  ) THEN
    ALTER TABLE questions ADD COLUMN year int;
  END IF;
END;
$$;

-- 6. Allow admins to SELECT all subscriptions (not just own)
DROP POLICY IF EXISTS "subs_admin_all" ON subscriptions;
CREATE POLICY "subs_admin_all" ON subscriptions FOR ALL USING (is_admin());

-- 7. Allow users to UPDATE their own subscription (for status changes to 'pending')
DROP POLICY IF EXISTS "subs_update_own" ON subscriptions;
CREATE POLICY "subs_update_own" ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. Fix handle_subscription_change trigger function to also stamp approved_by/approved_at
CREATE OR REPLACE FUNCTION handle_subscription_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When status goes to active, set is_premium on profile
  IF NEW.status = 'active' THEN
    UPDATE profiles SET is_premium = true WHERE id = NEW.user_id;
    -- stamp approval if not yet set
    IF NEW.approved_by IS NULL THEN
      NEW.approved_by := auth.uid();
      NEW.approved_at := now();
    END IF;
  -- When status goes to cancelled / expired, revoke premium
  ELSIF NEW.status IN ('cancelled', 'expired') THEN
    -- Only revoke if they have no other active subscription
    UPDATE profiles SET is_premium = false
    WHERE id = NEW.user_id
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions
        WHERE user_id = NEW.user_id
          AND status = 'active'
          AND id <> NEW.id
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscription_change ON subscriptions;
CREATE TRIGGER on_subscription_change
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_subscription_change();

-- 9. Also run on INSERT (new subscription doesn't auto-grant premium, pending = wait for admin)
-- But if admin inserts with status = 'active' it should auto-grant
CREATE OR REPLACE FUNCTION handle_subscription_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE profiles SET is_premium = true WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscription_insert ON subscriptions;
CREATE TRIGGER on_subscription_insert
  AFTER INSERT ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_subscription_insert();

-- 10. Helpful view: admin subscription summary with user email
CREATE OR REPLACE VIEW admin_subscription_view AS
SELECT
  s.id,
  s.plan,
  s.amount,
  s.payment_reference,
  s.status,
  s.admin_notes,
  s.starts_at,
  s.expires_at,
  s.created_at,
  s.approved_at,
  u.email AS user_email,
  p.full_name AS user_name,
  p.phone AS user_phone,
  ap.email AS approved_by_email
FROM subscriptions s
JOIN auth.users u ON u.id = s.user_id
JOIN profiles p ON p.id = s.user_id
LEFT JOIN auth.users ap ON ap.id = s.approved_by;

-- Grant admin access to the view
GRANT SELECT ON admin_subscription_view TO authenticated;
