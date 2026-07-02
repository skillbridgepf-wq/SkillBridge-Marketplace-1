import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser Supabase client for client-side operations.
 * Uses @supabase/ssr which properly handles session persistence via cookies.
 *
 * Session management:
 * - Sessions are stored in cookies by the SSR adapter
 * - Cookies are automatically sent with all requests
 * - Middleware can read cookies to validate auth on protected routes
 * - Token refresh is automatic
 *
 * Note: We keep types as `any` because supabase-js v2 generic inference
 * can break custom Database type definitions. Cast at call sites instead.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createBrowserClient<any>(supabaseUrl, supabaseAnonKey);
