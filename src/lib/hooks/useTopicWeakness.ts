import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface TopicWeaknessItem {
  topic: string;
  subject: string;
  incorrect: number;
  total: number;
  accuracy: number; // 0–100
}

export function useTopicWeakness() {
  const { user } = useAuth();

  return useQuery<TopicWeaknessItem[]>({
    queryKey: ['topicWeakness', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch all answers the user got wrong, joined to the question topic/subject
      const { data, error } = await supabase
        .from('exam_answers')
        .select(`
          is_correct,
          questions (
            topic,
            subjects ( name )
          ),
          exam_sessions!inner ( user_id )
        `)
        .eq('exam_sessions.user_id', user.id);

      if (error) throw error;

      // Aggregate by topic
      const map: Record<string, { subject: string; incorrect: number; total: number }> = {};

      (data || []).forEach((row: any) => {
        const topic: string = row.questions?.topic || 'General';
        const subject: string = row.questions?.subjects?.name || 'Unknown';
        if (!map[topic]) map[topic] = { subject, incorrect: 0, total: 0 };
        map[topic].total += 1;
        if (!row.is_correct) map[topic].incorrect += 1;
      });

      return Object.entries(map)
        .map(([topic, { subject, incorrect, total }]) => ({
          topic,
          subject,
          incorrect,
          total,
          accuracy: total > 0 ? Math.round(((total - incorrect) / total) * 100) : 100,
        }))
        // Sort by most incorrect first
        .sort((a, b) => b.incorrect - a.incorrect)
        .slice(0, 8); // top 8 weak topics
    },
    enabled: !!user,
  });
}
