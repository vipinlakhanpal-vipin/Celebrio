import { NextRequest } from "next/server";

/**
 * Cron endpoints (approval generation + sending) aren't tied to a signed-in
 * user's session — they're called by Vercel Cron (or any scheduler) on a
 * timer. Guard them with a shared secret instead of Supabase auth.
 *
 * Vercel Cron automatically sends `Authorization: Bearer ${CRON_SECRET}`
 * for jobs defined in vercel.json, so this "just works" once CRON_SECRET is
 * set in your project's environment variables.
 */
export function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if not configured
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export function appBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
