-- ============================================================
-- 016_admin_subscriptions_rpc_and_pricing.sql
-- 1. RPC: get_admin_subscriptions() — joins subscriptions + profiles
--    (fixes 400 because subscriptions.user_id → auth.users, not profiles)
-- 2. Update pricing in site_settings
-- 3. Create subscription_plan_features table
-- ============================================================

-- ============================================================
-- 1. RPC to fetch subscriptions with user profile info
--    Bypasses PostgREST FK limitation (auth.users vs profiles)
-- ============================================================
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

-- ============================================================
-- 2. Update pricing in site_settings
-- ============================================================
UPDATE site_settings
SET value = '[
  {
    "id": "free",
    "name": "Free",
    "price": 0,
    "price_display": "Free",
    "period": "forever",
    "features": ["10 questions per subject per day", "Basic score tracking", "Leaderboard view"],
    "is_highlighted": false
  },
  {
    "id": "monthly",
    "name": "Monthly",
    "price": 2500,
    "price_display": "₦2,500",
    "period": "per month",
    "features": ["Unlimited questions", "All universities", "Full CBT exam mode", "Detailed analytics", "Bookmarks"],
    "is_highlighted": false
  },
  {
    "id": "quarterly",
    "name": "Quarterly",
    "price": 6500,
    "price_display": "₦6,500",
    "period": "per 3 months",
    "features": ["Everything in Monthly", "Save ₦1,000", "PDF study materials", "Priority support"],
    "is_highlighted": true
  },
  {
    "id": "yearly",
    "name": "Yearly",
    "price": 25000,
    "price_display": "₦25,000",
    "period": "per year",
    "features": ["Everything in Quarterly", "Save ₦5,000", "Early access to new features", "1-on-1 support session"],
    "is_highlighted": false
  }
]'::jsonb
WHERE key = 'pricing_plans';

-- ============================================================
-- 3. Add subscription_plan column to profiles (track which plan)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_plan text
      CHECK (subscription_plan IN ('free', 'monthly', 'quarterly', 'yearly'))
      DEFAULT 'free';
  END IF;
END;
$$;

-- ============================================================
-- 4. Update handle_subscription_change to also set plan on profile
-- ============================================================
CREATE OR REPLACE FUNCTION handle_subscription_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    -- Grant premium + store which plan they have
    UPDATE profiles
    SET
      is_premium = true,
      premium_expires_at = NEW.expires_at,
      subscription_plan = COALESCE(NEW.plan, 'monthly')
    WHERE id = NEW.user_id;

    -- Stamp approval info
    IF NEW.approved_by IS NULL THEN
      NEW.approved_by := auth.uid();
      NEW.approved_at := now();
    END IF;

  ELSIF NEW.status IN ('cancelled', 'expired') THEN
    -- Only revoke premium if no other active subscription exists
    UPDATE profiles
    SET
      is_premium = false,
      premium_expires_at = NULL,
      subscription_plan = 'free'
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
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_subscription_change();

-- ============================================================
-- 5. Backfill subscription_plan for existing premium users
-- ============================================================
UPDATE profiles p
SET subscription_plan = s.plan
FROM (
  SELECT DISTINCT ON (user_id) user_id, plan
  FROM subscriptions
  WHERE status = 'active'
  ORDER BY user_id, created_at DESC
) s
WHERE p.id = s.user_id AND p.is_premium = true;
