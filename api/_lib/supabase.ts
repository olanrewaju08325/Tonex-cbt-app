import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; 
// Note: In production Vercel, you must add SUPABASE_SERVICE_ROLE_KEY to environment variables
// so the cron jobs can bypass RLS and read all users.

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables in Vercel.");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
