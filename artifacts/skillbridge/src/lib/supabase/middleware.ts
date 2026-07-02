import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Update session in middleware and return a response with updated cookies.
 */
export async function updateSession(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { createServerClient } = await import("@supabase/ssr");

  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Parameters<typeof response.cookies.set>[2];
          }[],
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  request.cookies.getAll().forEach(({ name, value }) => {
    if (!response.cookies.has(name)) {
      response.cookies.set(name, value, { path: "/" });
    }
  });

  return { response, user };
}
