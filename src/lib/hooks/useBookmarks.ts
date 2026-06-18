import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../../contexts/AuthContext';

export function useBookmarks() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          id,
          question_id,
          questions (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ questionId, isBookmarked }: { questionId: string, isBookmarked: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      
      if (isBookmarked) {
        // remove
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('question_id', questionId);
        if (error) throw error;
      } else {
        // add
        const { error } = await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, question_id: questionId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    }
  });
}
