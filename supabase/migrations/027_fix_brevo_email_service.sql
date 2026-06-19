-- Fix Brevo Email service to call net.http_post with correct schema and parameter types
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
  req_body jsonb; -- Changed from text to jsonb to match pg_net signature
  res_id bigint;
BEGIN
  -- 1. Security Check: Authenticated standard users can only send emails to their own registered address.
  IF NOT is_admin() AND recipient_email != auth.jwt()->>'email' THEN
    RAISE EXCEPTION 'Unauthorized: Standard users can only send email reports to their own registered account email address.';
  END IF;

  -- 2. Fetch credentials from site_settings
  SELECT (value->>0) INTO brevo_key FROM site_settings WHERE key = 'brevo_api_key';
  SELECT (value->>0) INTO sender_email_val FROM site_settings WHERE key = 'sender_email';

  IF brevo_key IS NULL OR sender_email_val IS NULL THEN
    RAISE EXCEPTION 'Configuration Error: Brevo API key or Sender Email parameter is missing in site_settings';
  END IF;

  -- 3. Build API payload as jsonb
  req_body := jsonb_build_object(
    'sender', jsonb_build_object('name', 'Tonex CBT Support', 'email', sender_email_val),
    'to', jsonb_build_array(jsonb_build_object('email', recipient_email, 'name', recipient_name)),
    'subject', subject,
    'htmlContent', html_content
  );

  -- 4. Asynchronously dispatch HTTP Post request via pg_net (net.http_post)
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
