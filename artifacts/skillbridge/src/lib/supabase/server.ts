import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Server-side Supabase client for use in Server Components, Route Handlers, and Middleware.
 * Handles cookies for session persistence across requests.
 *
 * Usage in Server Components:
 *   const supabase = await createSupabaseServerClient();
 *   const { data, error } = await supabase.from('table').select();
 *
 * Usage in Route Handlers:
 *   export async function GET(request: Request) {
 *     const supabase = await createSupabaseServerClient();
 *     ...
 *   }
 *
 * The cookie jar is async in Next.js 15, so this function must be async.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
