-- Migration: 023_email_automation_schema.sql

-- 1. Create email_campaign_logs to track which users received which emails
CREATE TABLE IF NOT EXISTS public.email_campaign_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_type TEXT NOT NULL, -- e.g., 'welcome_day_1', 'we_miss_you_1', 'low_score_intervention'
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Index for fast lookup to prevent duplicates
CREATE INDEX IF NOT EXISTS idx_email_campaign_logs_user_campaign 
ON public.email_campaign_logs(user_id, campaign_type);

-- 2. Add parent_email field to profiles for Weekly Reports
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS parent_email TEXT;

-- 3. RLS for email_campaign_logs
ALTER TABLE public.email_campaign_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email logs" 
ON public.email_campaign_logs FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all email logs" 
ON public.email_campaign_logs FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'superadmin')
    )
);

-- Note: To allow backend Vercel functions to insert logs, you will need to use the Service Role Key
-- or bypass RLS since the Vercel function acts as the server.
