import { createClient } from '@supabase/supabase-js';
import type { Profile, University, Subject, Question, ExamSession, ExamAnswer, Subscription, Bookmark, DailyUsage } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Regular client - respects RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client - NOW SECURED. It uses the anon key because exposing the service role key in the frontend allows anyone to hack the database.
// To bypass RLS for admins, the SQL policies in `022_final_admin_rls_fix.sql` MUST be executed in the Supabase Dashboard.
export const adminSupabase = createClient(supabaseUrl, supabaseAnonKey);
