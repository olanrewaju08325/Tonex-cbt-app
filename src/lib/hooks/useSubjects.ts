import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Subject } from '../../types/database';

export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Subject[];
    },
  });
}
