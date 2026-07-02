import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase client — deliberately un-typed at the Supabase boundary.
 *
 * supabase-js v2.110.0 changed the generic inference chain for
 * insert/update/upsert such that hand-written Database types fail the
 * internal `GenericTable` constraint, causing the `values` parameter to
 * resolve to `never[]`.  We keep all our application-level types in
 * `types/database.ts` and cast at the query call sites rather than relying on
 * the Supabase client generic.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey);
