export type Role = 'user' | 'admin' | 'superadmin';
export type SubscriptionPlan = 'monthly' | 'quarterly' | 'yearly' | 'manual';
export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled';
export type ExamMode = 'practice' | 'exam';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  target_university_id: string | null;
  role: Role;
  is_premium: boolean;
  is_blocked: boolean;
  premium_expires_at: string | null;
  avatar_url: string | null;
  streak_count: number;
  last_active_date: string | null;
  created_at: string;
}

export interface University {
  id: string;
  name: string;
  short_name: string;
  state: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface Question {
  id: string;
  university_id: string | null;
  subject_id: string;
  text: string;
  image_url: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string | null;
  reference: string | null;
  year: number | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamSession {
  id: string;
  user_id: string;
  university_id: string | null;
  subject_id: string | null;
  mode: ExamMode;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  time_taken_seconds: number | null;
  completed_at: string;
}

export interface ExamAnswer {
  id: string;
  session_id: string;
  question_id: string;
  selected_answer: 'A' | 'B' | 'C' | 'D' | null;
  is_correct: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  payment_reference: string | null;
  payment_proof_url: string | null;
  status: SubscriptionStatus;
  amount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  question_id: string;
  created_at: string;
}

export interface DailyUsage {
  id: string;
  user_id: string;
  subject_id: string;
  usage_date: string;
  questions_answered: number;
}
