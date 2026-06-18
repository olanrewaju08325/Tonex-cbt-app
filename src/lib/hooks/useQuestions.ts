import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Question } from '../../types/database';
import { cacheQuestions, getOfflineQuestions } from '../offlineCache';

interface UseQuestionsOptions {
  universityId: string | null;
  subjectId?: string;
  subjectIds?: string[];
  limit?: number;
}

export function useQuestions({ universityId, subjectId, subjectIds, limit }: UseQuestionsOptions) {
  return useQuery({
    queryKey: ['questions', universityId, subjectId, subjectIds, limit],
    queryFn: async () => {
      // If client is offline, fallback directly to IndexedDB
      if (!navigator.onLine) {
        const localQs = await getOfflineQuestions({
          universityId,
          subjectId,
          subjectIds,
          limit,
        });
        if (localQs && localQs.length > 0) {
          return localQs as (Question & { subjects?: { name: string } })[];
        }
      }

      try {
        let query = supabase
          .from('questions')
          .select('*, subjects(name)')
          .eq('is_published', true);

        if (subjectId) {
          query = query.eq('subject_id', subjectId);
        } else if (subjectIds && subjectIds.length > 0) {
          query = query.in('subject_id', subjectIds);
        }

        if (universityId) {
          query = query.eq('university_id', universityId);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // Asynchronously update local cache so they are available offline
        if (data && data.length > 0) {
          cacheQuestions(data).catch((err) =>
            console.error("Failed to write questions cache:", err)
          );
        }

        let allQuestions = data as (Question & { subjects?: { name: string } })[];
        
        // If we have an array of subjects, we want `limit` questions PER subject
        if (subjectIds && subjectIds.length > 0 && limit) {
          let finalQuestions: Question[] = [];
          for (const sId of subjectIds) {
            let qs = allQuestions.filter(q => q.subject_id === sId);
            qs = qs.sort(() => Math.random() - 0.5);
            finalQuestions = finalQuestions.concat(qs.slice(0, limit));
          }
          return finalQuestions; 
        }

        // Single subject shuffle
        allQuestions = allQuestions.sort(() => Math.random() - 0.5);
        
        if (limit) {
          allQuestions = allQuestions.slice(0, limit);
        }
        
        return allQuestions;
      } catch (err) {
        console.warn("Online questions fetch failed, trying local fallback:", err);
        const localQs = await getOfflineQuestions({
          universityId,
          subjectId,
          subjectIds,
          limit,
        });
        if (localQs && localQs.length > 0) {
          return localQs as (Question & { subjects?: { name: string } })[];
        }
        throw err;
      }
    },
    enabled: !!subjectId || !!(subjectIds && subjectIds.length > 0),
  });
}

