import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../../contexts/AuthContext';

export function useDailyLimit(subjectId: string) {
  const { user, profile } = useAuth();
  
  return useQuery({
    queryKey: ['dailyLimit', user?.id, subjectId],
    queryFn: async () => {
      if (!user) return { remaining: 0, is_premium: false };
      
      if (profile?.is_premium) {
        return { remaining: 999, is_premium: true };
      }
      
      const { data, error } = await supabase.rpc('check_daily_limit', {
        p_user_id: user.id,
        p_subject_id: subjectId
      });
      
      if (error) throw error;
      return { remaining: data as number, is_premium: false };
    },
    enabled: !!user && !!subjectId,
  });
}
