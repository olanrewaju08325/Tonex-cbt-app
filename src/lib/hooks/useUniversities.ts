import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { University } from '../../types/database';

export function useUniversities() {
  return useQuery({
    queryKey: ['universities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as University[];
    },
  });
}
