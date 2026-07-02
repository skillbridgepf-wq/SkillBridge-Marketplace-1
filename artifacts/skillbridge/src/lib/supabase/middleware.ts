import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Update session in middleware and return a response with updated cookies.
 *
 * This ensures:
 * 1. Session is refreshed on every request (if refresh token is still valid)
 * 2. Updated cookies are returned in the response
 * 3. Token expiration is handled automatically
 *
 * Usage in middleware:
 *   const { response, user } = await updateSession(request);
 *   if (!user) return NextResponse.redirect('/auth/login');
 *   return response;
 */
export async function updateSession(request: NextRequest) {
  let response: NextResponse;

  // Create a response early so we can set cookies
  response = new NextResponse(null, { status: 999 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { createServerClient } = await import('@supabase/ssr');
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session - this updates the token if it's expired
  const { data: { user } } = await supabase.auth.getUser();

  // Copy cookies from the request if not already set by setAll
  request.cookies.getAll().forEach(({ name, value }) => {
    if (!response.cookies.has(name)) {
      response.cookies.set(name, value, { path: '/' });
    }
  });

  return { response, user };
}
