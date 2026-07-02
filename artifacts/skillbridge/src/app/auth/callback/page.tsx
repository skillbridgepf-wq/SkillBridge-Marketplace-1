'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Subscribe to auth state changes — clean up on unmount
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.replace('/dashboard');
      } else if (event === 'SIGNED_OUT') {
        router.replace('/auth/login');
      }
    });

    // Check the current session immediately (handles email-confirmation hash tokens)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard');
      } else {
        // Wait a moment for the auth state change to fire before giving up
        setTimeout(() => {
          router.replace('/auth/login');
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
      <p className="text-slate-600 font-medium">Completing sign in…</p>
    </div>
  );
}
