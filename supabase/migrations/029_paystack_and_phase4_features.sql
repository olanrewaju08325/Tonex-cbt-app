-- Phase 4: Subscriptions, Payments & Premium Locking

-- 1. ADD TRIAL TOKEN COLUMN
-- Allow free tier users exactly 1 free trial token
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_used_free_trial_token boolean DEFAULT false;

-- 2. SEED PAYSTACK SETTINGS
INSERT INTO public.site_settings (key, value) VALUES
('paystack_public_key', '"pk_test_41c0e86b0337f714275a593e7f4153097bbf67b8"'::jsonb),
('paystack_secret_key', '"sk_test_5ae892de3f3015a0bf4966c2063ae2254a374e4c"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. CREATE PAYSTACK VERIFICATION RPC FUNCTION
CREATE OR REPLACE FUNCTION public.verify_paystack_payment(p_reference text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  paystack_secret text;
  req_url text;
  res_json jsonb;
  v_user_id uuid;
  v_plan text;
  v_amount numeric;
  v_starts_at timestamptz;
  v_expires_at timestamptz;
  v_months int;
  field jsonb;
BEGIN
  -- Fetch Paystack secret key from site_settings
  SELECT (value->>0) INTO paystack_secret FROM site_settings WHERE key = 'paystack_secret_key';
  
  IF paystack_secret IS NULL OR paystack_secret = 'sk_test_placeholder' THEN
    RAISE EXCEPTION 'Paystack secret key is not configured in site_settings';
  END IF;

  -- Execute verification request via extensions.http (synchronous http)
  req_url := 'https://api.paystack.co/transaction/verify/' || p_reference;
  
  BEGIN
    SELECT content::jsonb INTO res_json
    FROM extensions.http((
      'GET',
      req_url,
      ARRAY[extensions.http_header('Authorization', 'Bearer ' || paystack_secret)],
      NULL,
      NULL
    )::extensions.http_request);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to connect to Paystack API: %', SQLERRM;
  END;

  -- Verify response payload
  IF res_json IS NULL OR res_json->>'status' != 'true' OR res_json->'data'->>'status' != 'success' THEN
    RAISE EXCEPTION 'Payment verification failed or transaction is not successful.';
  END IF;

  -- Parse metadata
  IF res_json->'data'->'metadata'->'custom_fields' IS NOT NULL THEN
    FOR field IN SELECT * FROM jsonb_array_elements(res_json->'data'->'metadata'->'custom_fields')
    LOOP
      IF field->>'variable_name' = 'user_id' THEN
        v_user_id := (field->>'value')::uuid;
      ELSIF field->>'variable_name' = 'plan' THEN
        v_plan := field->>'value';
      END IF;
    END LOOP;
  END IF;

  -- Fallbacks
  IF v_user_id IS NULL THEN
    v_user_id := (res_json->'data'->'metadata'->>'user_id')::uuid;
  END IF;
  IF v_plan IS NULL THEN
    v_plan := res_json->'data'->'metadata'->>'plan';
  END IF;
  IF v_user_id IS NULL THEN
    v_user_id := auth.uid();
  END IF;

  IF v_user_id IS NULL OR v_plan IS NULL THEN
    RAISE EXCEPTION 'Missing user_id or plan metadata in Paystack transaction payload.';
  END IF;

  -- Calculate subscription dates
  v_starts_at := now();
  IF v_plan = 'monthly' THEN
    v_months := 1;
  ELSIF v_plan = 'quarterly' THEN
    v_months := 3;
  ELSIF v_plan = 'yearly' THEN
    v_months := 12;
  ELSE
    v_months := 1;
  END IF;
  
  v_expires_at := v_starts_at + (v_months || ' month')::interval;
  v_amount := (res_json->'data'->>'amount')::numeric / 100; -- convert from kobo

  -- Insert or update active subscription
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE payment_reference = p_reference) THEN
    UPDATE public.subscriptions
    SET
      status = 'active',
      starts_at = v_starts_at,
      expires_at = v_expires_at,
      admin_notes = 'Auto-activated via Paystack verification update'
    WHERE payment_reference = p_reference;
  ELSE
    INSERT INTO public.subscriptions (
      user_id,
      plan,
      payment_reference,
      status,
      amount,
      starts_at,
      expires_at,
      admin_notes
    ) VALUES (
      v_user_id,
      v_plan,
      p_reference,
      'active',
      v_amount,
      v_starts_at,
      v_expires_at,
      'Auto-activated via Paystack'
    );
  END IF;

  -- Update user profile to premium
  UPDATE public.profiles
  SET is_premium = true
  WHERE id = v_user_id;

  -- Log the activity in admin_logs
  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    coalesce(auth.uid(), v_user_id),
    'PAYSTACK_AUTO_ACTIVATION',
    'subscription',
    p_reference,
    jsonb_build_object(
      'user_id', v_user_id,
      'plan', v_plan,
      'amount', v_amount,
      'reference', p_reference
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'plan', v_plan,
    'amount', v_amount,
    'expires_at', v_expires_at
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_paystack_payment(text) TO authenticated;
