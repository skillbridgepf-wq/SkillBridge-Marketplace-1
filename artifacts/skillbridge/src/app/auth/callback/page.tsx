'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * OAuth callback handler for Supabase authentication.
 *
 * Flow:
 * 1. Extract authorization code from URL
 * 2. Exchange code for session using official SSR client
 * 3. Session is automatically stored in cookies
 * 4. Verify user was created successfully
 * 5. Redirect to dashboard (or redirect param if provided)
 *
 * The official @supabase/ssr client handles cookie storage automatically,
 * so the session persists across page navigation and refresh.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        // Exchange the authorization code for a session.
        // The @supabase/ssr client will store this in cookies automatically.
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          window.location.href,
        );

        if (exchangeError) {
          console.error('Session exchange error:', exchangeError);
          setError('Failed to complete authentication. Redirecting...');
          setTimeout(() => router.replace('/auth/login'), 2000);
          return;
        }

        // Session is now stored in cookies. Verify by getting user.
        const {
          data: { user },
          error: getUserError,
        } = await supabase.auth.getUser();

        if (getUserError || !user) {
          console.error('Get user error:', getUserError);
          setError('Session established but user not found. Redirecting...');
          setTimeout(() => router.replace('/auth/login'), 2000);
          return;
        }

        // Session is valid and stored in cookies. Middleware will allow access to /dashboard.
        // Redirect to dashboard (or redirect param if provided).
        const redirect = new URL(window.location.href).searchParams.get('redirect');
        router.replace(redirect && !redirect.startsWith('/auth') ? redirect : '/dashboard');
      } catch (err) {
        console.error('Callback error:', err);
        setError('An unexpected error occurred. Redirecting...');
        setTimeout(() => router.replace('/auth/login'), 2000);
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      {error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : (
        <p className="text-sm text-slate-600">Completing sign in...</p>
      )}
    </div>
  );
}
