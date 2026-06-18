import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  priority: number;
}

export function useAnnouncements(limit = 3) {
  return useQuery({
    queryKey: ['announcements', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_announcements', { limit_count: limit, offset_count: 0 });
      if (error) throw error;
      return data as Announcement[];
    },
  });
}
