import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';

export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string;
  avg_score: number;
  total_exams: number;
  university_short_name: string;
}

export function useLeaderboard(universityId?: string | null, weekly?: boolean) {
  return useQuery({
    queryKey: ['leaderboard', universityId, weekly],
    queryFn: async () => {
      const rpcName = weekly ? 'get_weekly_leaderboard' : 'get_leaderboard';
      const { data, error } = await supabase.rpc(rpcName, { 
        p_university_id: universityId || null 
      });
      if (error) {
        // Fallback to non-weekly leaderboard if new RPC function is not created yet
        if (weekly) {
          const fallback = await supabase.rpc('get_leaderboard', { 
            p_university_id: universityId || null 
          });
          if (!fallback.error) return fallback.data as LeaderboardEntry[];
        }
        throw error;
      }
      return data as LeaderboardEntry[];
    },
  });
}
