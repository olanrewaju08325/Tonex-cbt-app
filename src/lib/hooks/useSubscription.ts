import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { SubscriptionPlan, Subscription } from '../../types/database';

export function useSubscription() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows
      return data as Subscription | null;
    },
    enabled: !!user,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ plan, amount, payment_reference }: { plan: SubscriptionPlan, amount: number, payment_reference: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan,
          amount,
          payment_reference,
          status: 'pending',
          starts_at: new Date().toISOString(),
          // expires_at will be set when admin approves and changes status to active, 
          // or we can set a provisional one here. We'll let admin handle the exact expiry date.
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  });
}
