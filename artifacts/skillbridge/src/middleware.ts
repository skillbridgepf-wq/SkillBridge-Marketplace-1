import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/profile', '/projects/new', '/contracts'];

/**
 * Decode a JWT payload and verify it is structurally valid and not expired.
 * We do NOT verify the signature here (that requires the secret and a network
 * call) — the page's own `useAuth()` / Supabase SDK will reject invalid
 * tokens.  This is a lightweight "definitely not authenticated" guard to
 * avoid serving protected pages to unauthenticated users and leaking HTML.
 */
function jwtIsNotExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    // Base64url → Base64 → JSON
    const pad = (s: string) => s + '='.repeat((4 - (s.length % 4)) % 4);
    const payload = JSON.parse(
      Buffer.from(pad(parts[1].replace(/-/g, '+').replace(/_/g, '/')), 'base64').toString('utf-8'),
    );
    if (typeof payload.exp !== 'number') return false;
    // Give a 60-second clock skew buffer
    return payload.exp > Math.floor(Date.now() / 1000) - 60;
  } catch {
    return false;
  }
}

/** Extract an access token from a Supabase session cookie value. */
function extractAccessToken(cookieValue: string): string | null {
  try {
    const decoded = decodeURIComponent(cookieValue);
    const parsed: unknown = JSON.parse(decoded);
    if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0];
    if (parsed && typeof parsed === 'object' && 'access_token' in parsed) {
      const t = (parsed as Record<string, unknown>).access_token;
      if (typeof t === 'string') return t;
    }
    // Raw JWT (some supabase-js versions)
    if (typeof parsed === 'string') return parsed;
  } catch {
    // Cookie might be a raw JWT string (not JSON)
    if (cookieValue.split('.').length === 3) return cookieValue;
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );

  if (!isProtected) return NextResponse.next();

  // Find any Supabase auth token cookie (name format: sb-{project-ref}-auth-token[.N])
  const authCookie = request.cookies
    .getAll()
    .find((c) => /-auth-token/.test(c.name) && c.value.length > 20);

  if (!authCookie) {
    return redirectToLogin(request, pathname);
  }

  const token = extractAccessToken(authCookie.value);
  if (!token || !jwtIsNotExpired(token)) {
    return redirectToLogin(request, pathname);
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const loginUrl = new URL('/auth/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/projects/new',
    '/contracts/:path*',
  ],
};
