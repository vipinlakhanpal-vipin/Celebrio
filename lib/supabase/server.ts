import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Reads/writes the auth session via Next.js cookies.
 * Still respects Row Level Security (it authenticates as the signed-in user).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component sometimes; safe to
            // ignore because middleware refreshes the session on navigation.
          }
        },
      },
    }
  );
}

/**
 * The layout and every page under app/(app)/ each independently ask "who is
 * signed in?" — and auth.getUser() always makes a real network round-trip to
 * Supabase's auth server to verify the token (by design, unlike the
 * local-only getSession()). Without this, one page load could fire off 2-3
 * of those round trips back-to-back. React's cache() dedupes it to a single
 * call per request, wherever it's called from within that same request.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Admin client using the service-role key. NEVER import this from a
 * Client Component or expose the key with a NEXT_PUBLIC_ prefix. Only use it
 * in Route Handlers that need to read/write across all users (e.g. cron jobs,
 * the admin analytics endpoint) after checking the caller is an admin.
 */
export async function createAdminClient() {
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
