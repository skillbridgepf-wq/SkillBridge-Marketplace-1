"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        // Exchange the code for a session
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          window.location.href,
        );

        if (exchangeError) {
          console.error("Session exchange error:", exchangeError);
          setError("Failed to complete authentication. Redirecting...");
          setTimeout(() => router.replace("/auth/login"), 2000);
          return;
        }

        // Session established successfully, redirect to dashboard
        router.replace("/dashboard");
      } catch (err) {
        console.error("Callback error:", err);
        setError("An unexpected error occurred. Redirecting...");
        setTimeout(() => router.replace("/auth/login"), 2000);
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