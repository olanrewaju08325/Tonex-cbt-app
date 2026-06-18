import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { ExamSession } from '../../types/database';

export function useExamSessions(limit = 5) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['examSessions', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('exam_sessions')
        .select(`
          *,
          subjects ( name ),
          universities ( name, short_name )
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSaveExamSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sessionData: Omit<ExamSession, 'id' | 'completed_at' | 'user_id'> & { answers: any[] }) => {
      if (!user) throw new Error('Not authenticated');

      const { answers, ...sessionInfo } = sessionData;
      
      // Insert session
      const { data: session, error: sessionError } = await supabase
        .from('exam_sessions')
        .insert({ ...sessionInfo, user_id: user.id })
        .select()
        .single();
        
      if (sessionError) throw sessionError;
      
      // Insert answers
      const answersToInsert = answers.map(ans => ({
        session_id: session.id,
        question_id: ans.question_id,
        selected_answer: ans.selected_answer,
        is_correct: ans.is_correct,
      }));
      
      const { error: answersError } = await supabase
        .from('exam_answers')
        .insert(answersToInsert);
        
      if (answersError) throw answersError;
      
      // Also update daily usage via RPC
      if (sessionInfo.subject_id) {
        await supabase.rpc('increment_daily_usage', {
          p_user_id: user.id,
          p_subject_id: sessionInfo.subject_id,
          p_count: sessionInfo.total_questions
        });
      }

      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examSessions'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLimit'] });
    }
  });
}
