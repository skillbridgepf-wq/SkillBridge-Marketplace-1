'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * Client-side hook for auth state management.
 *
 * This hook:
 * 1. Reads initial user from stored session (in cookies)
 * 2. Listens for auth state changes (login, logout, token refresh)
 * 3. Updates local state when auth changes
 * 4. Cleans up subscription on unmount
 *
 * The session is persisted in cookies by @supabase/ssr, so it survives
 * page navigation and refresh.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Get initial auth state from stored session
    const initAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (isMounted) {
          setUser(user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return { user, loading, isAuthenticated: !!user, signOut };
}
