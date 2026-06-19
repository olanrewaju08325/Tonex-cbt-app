import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import type { Session, User } from '@supabase/supabase-js';
import { syncOfflineSessions } from '../lib/offlineCache';
import { toast } from 'sonner';

interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  state: string;
  target_university_id: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (data: SignUpData) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (data) {
      const today = new Date().toISOString().split('T')[0];
      if (data.last_active_date !== today) {
        let newStreak = data.streak_count || 0;
        if (data.last_active_date) {
          const lastDate = new Date(data.last_active_date);
          const currDate = new Date(today);
          const diffDays = Math.floor((currDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          
          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays > 1) {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }
        
        await supabase.from('profiles').update({
          streak_count: newStreak,
          last_active_date: today
        }).eq('id', userId);
        
        data.streak_count = newStreak;
        data.last_active_date = today;
      }

      // Automatically revoke premium if subscription expired or missing
      const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('id, expires_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSub) {
        if (activeSub.expires_at && new Date(activeSub.expires_at) < new Date()) {
          await supabase.from('subscriptions')
            .update({ status: 'expired' })
            .eq('id', activeSub.id);
          
          await supabase.from('profiles')
            .update({ is_premium: false })
            .eq('id', userId);
          
          data.is_premium = false;
        }
      } else if (data.is_premium) {
        // No active subscription but profile says premium
        await supabase.from('profiles')
          .update({ is_premium: false })
          .eq('id', userId);
        
        data.is_premium = false;
      }

      setProfile(data);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Client-side Session Auto-Refresh Pre-emptive Check (every 60 seconds)
    const refreshInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.expires_at) {
        const timeToExpiry = session.expires_at - Math.floor(Date.now() / 1000);
        // If session expires in less than 10 minutes (600 seconds), refresh it pre-emptively
        if (timeToExpiry > 0 && timeToExpiry < 600) {
          console.log(`Pre-emptively refreshing session. Time to expiry: ${timeToExpiry}s`);
          const { error } = await supabase.auth.refreshSession();
          if (error) {
            console.error("Failed to auto-refresh session:", error.message);
          } else {
            console.log("Session refreshed successfully.");
          }
        }
      }
    }, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const handleSync = async () => {
      try {
        const count = await syncOfflineSessions(user.id);
        if (count > 0) {
          toast.success(`Synced ${count} offline exam session(s) to your account!`);
        }
      } catch (err) {
        console.error("Auto sync failed:", err);
      }
    };

    if (navigator.onLine) {
      handleSync();
    }

    window.addEventListener('online', handleSync);
    return () => window.removeEventListener('online', handleSync);
  }, [user]);

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (data: SignUpData) => {
    const { email, password, full_name, phone, state, target_university_id } = data;
    
    // We pass additional data so the trigger can pick up full_name, but we still do a manual insert
    // just in case, though the trigger handles basic profile creation.
    const res = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
        }
      }
    });

    if (res.error) {
      return { error: res.error };
    }

    // Now update the created profile with the extra fields
    if (res.data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone,
          state,
          target_university_id
        })
        .eq('id', res.data.user.id);
        
      if (profileError) {
        return { error: profileError };
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };
    const res = await supabase.from('profiles').update(data).eq('id', user.id);
    if (!res.error) {
      await refreshProfile();
    }
    return res;
  };

  const resetPassword = async (email: string) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password',
    });
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile, updateProfile, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
