import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface UserStats {
  tests_taken: number;
  avg_score: number;
  correct_answers: number;
  total_questions: number;
  streak_count: number;
}

const DEFAULT_STATS: UserStats = {
  tests_taken: 0,
  avg_score: 0,
  correct_answers: 0,
  total_questions: 0,
  streak_count: 0,
};

export function useUserStats() {
  const { user } = useAuth();
  
  return useQuery<UserStats | null>({
    queryKey: ['userStats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase.rpc('get_user_stats', { p_user_id: user.id });
      if (error) throw error;
      
      // Return default zeros if no sessions yet (new user)
      return (data?.[0] as UserStats | undefined) ?? DEFAULT_STATS;
    },
    enabled: !!user,
  });
}
