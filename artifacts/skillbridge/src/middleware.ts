import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/profile', '/projects/new', '/contracts'];

/**
 * Middleware to protect authenticated routes using official Supabase SSR.
 *
 * Flow:
 * 1. On every request, update session (refresh tokens if needed)
 * 2. Check if route is protected
 * 3. If protected and no valid session, redirect to login
 * 4. Return the response with updated session cookies
 *
 * This uses the official @supabase/ssr implementation which handles
 * session management, token refresh, and expiration automatically.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CRITICAL: Skip middleware for /auth/callback to allow OAuth code exchange
  // without interference. The callback handler will exchange the code for a
  // session and store it in cookies. Next request will see the new session.
  if (pathname === '/auth/callback' || pathname.startsWith('/auth/callback?')) {
    return NextResponse.next();
  }

  // Update session and get user (this refreshes tokens if needed)
  const { response, user } = await updateSession(request);

  // Check if route is protected
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );

  // If route is protected and no user, redirect to login
  if (isProtected && !user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Response already has updated cookies from updateSession
  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/projects/new',
    '/contracts/:path*',
    '/auth/callback',
  ],
};
