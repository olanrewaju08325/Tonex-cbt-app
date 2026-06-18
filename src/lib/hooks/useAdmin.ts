import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useAdminStats() {
  return useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      // Use the SECURITY DEFINER RPC so RLS doesn't block counting
      const { data, error } = await supabase.rpc('get_admin_stats');
      if (error) throw error;

      return {
        totalUsers:      Number(data?.total_users      ?? 0),
        premiumUsers:    Number(data?.premium_users    ?? 0),
        totalQuestions:  Number(data?.total_questions  ?? 0),
        universities:    Number(data?.total_universities ?? 0),
        newUsersToday:   Number(data?.new_today        ?? 0),
        revenue:         Number(data?.revenue          ?? 0),
      };
    },
    retry: 2,
    staleTime: 60_000,
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          is_premium,
          is_blocked,
          created_at,
          streak_count,
          target_university_id,
          universities!target_university_id (short_name, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    retry: 2,
    staleTime: 30_000,
  });
}

export function useAdminQuestions() {
  return useQuery({
    queryKey: ['adminQuestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          id,
          text,
          year,
          is_published,
          correct_answer,
          subjects!subject_id (name),
          universities!university_id (short_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    retry: 2,
    staleTime: 60_000,
  });
}
