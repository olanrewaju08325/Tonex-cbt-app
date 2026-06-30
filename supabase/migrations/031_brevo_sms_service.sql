-- 031_brevo_sms_service.sql

-- 1. Redefine send_email_via_brevo to be robust (case-insensitive keys search)
CREATE OR REPLACE FUNCTION public.send_email_via_brevo(
  recipient_email text,
  recipient_name text,
  subject text,
  html_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  brevo_key text;
  sender_email_val text;
  req_body jsonb;
  res_id bigint;
BEGIN
  -- Security Check
  IF NOT is_admin() AND recipient_email != auth.jwt()->>'email' THEN
    RAISE EXCEPTION 'Unauthorized: Standard users can only send email reports to their own registered account email address.';
  END IF;

  -- Fetch credentials from site_settings (supporting case variations)
  SELECT (value->>0) INTO brevo_key FROM site_settings WHERE key IN ('brevo_api_key', 'BREVO_API_KEY') LIMIT 1;
  SELECT (value->>0) INTO sender_email_val FROM site_settings WHERE key IN ('sender_email', 'SENDER_EMAIL') LIMIT 1;

  IF brevo_key IS NULL OR sender_email_val IS NULL THEN
    RAISE EXCEPTION 'Configuration Error: Brevo API key or Sender Email parameter is missing in site_settings';
  END IF;

  -- Build API payload as jsonb
  req_body := jsonb_build_object(
    'sender', jsonb_build_object('name', 'Tonex CBT Support', 'email', sender_email_val),
    'to', jsonb_build_array(jsonb_build_object('email', recipient_email, 'name', recipient_name)),
    'subject', subject,
    'htmlContent', html_content
  );

  -- Asynchronously dispatch HTTP Post request via pg_net (net.http_post)
  SELECT net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object(
      'api-key', brevo_key,
      'content-type', 'application/json',
      'accept', 'application/json'
    ),
    body := req_body
  ) INTO res_id;

  RETURN jsonb_build_object('success', true, 'request_id', res_id);
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.send_email_via_brevo(text, text, text, text) TO authenticated;


-- 2. Create send_sms_via_brevo RPC function
CREATE OR REPLACE FUNCTION public.send_sms_via_brevo(
  recipient_phone text,
  message_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  brevo_key text;
  req_body jsonb;
  res_id bigint;
BEGIN
  -- Security Check
  IF NOT is_admin() THEN
    -- Verify that standard users only send SMS to their own registered phone number
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND phone = recipient_phone
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Standard users can only send test SMS to their own registered phone number.';
    END IF;
  END IF;

  -- Fetch credentials from site_settings (supporting case variations)
  SELECT (value->>0) INTO brevo_key FROM site_settings WHERE key IN ('brevo_api_key', 'BREVO_API_KEY') LIMIT 1;

  IF brevo_key IS NULL THEN
    RAISE EXCEPTION 'Configuration Error: Brevo API key parameter is missing in site_settings';
  END IF;

  -- Build SMS API payload as jsonb
  -- Note: sender name must be between 1 and 11 characters (alphanumeric)
  req_body := jsonb_build_object(
    'sender', 'TonexCBT',
    'recipient', recipient_phone,
    'content', message_content
  );

  -- Asynchronously dispatch HTTP Post request via pg_net (net.http_post)
  SELECT net.http_post(
    url := 'https://api.brevo.com/v3/transactionalSMS/sms',
    headers := jsonb_build_object(
      'api-key', brevo_key,
      'content-type', 'application/json',
      'accept', 'application/json'
    ),
    body := req_body
  ) INTO res_id;

  RETURN jsonb_build_object('success', true, 'request_id', res_id);
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.send_sms_via_brevo(text, text) TO authenticated;
