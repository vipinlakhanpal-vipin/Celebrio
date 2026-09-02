import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isoDaysAgo } from "@/lib/date-utils";

/**
 * App-wide analytics for the account marked profiles.is_admin = true
 * (set that flag manually in Supabase for your own account after signing
 * up — see README). Everyone else gets 403; their own Settings page still
 * shows their personal sign-in history via normal RLS-scoped queries.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = await createAdminClient();
  const thirtyDaysAgoIso = isoDaysAgo(30);

  const [{ data: profiles, count: totalUsers }, { data: signIns }, { data: usageEvents }] = await Promise.all([
    admin.from("profiles").select("id, email, full_name, created_at", { count: "exact" }),
    admin
      .from("sign_ins")
      .select("id, user_id, signed_in_at, city, region, country, device_type, ip_address")
      .order("signed_in_at", { ascending: false })
      .limit(200),
    // Scoped to the last 30 days (not just "the most recent 2000 events
    // overall") so the per-user usage % below uses the same window as the
    // personal "Active days (30d)" tile in Settings, no matter how many
    // users or events there are.
    admin.from("usage_events").select("user_id, occurred_at").gte("occurred_at", thirtyDaysAgoIso),
  ]);

  // First name for the admin list — falls back to the email's local part,
  // title-cased, same fallback used everywhere else a name might be unset,
  // so no row ever shows blank.
  function firstNameFor(p: { email: string | null; full_name: string | null }) {
    const stored = p.full_name && !p.full_name.includes("@") ? p.full_name.trim().split(" ")[0] : "";
    if (stored) return stored;
    const local = (p.email || "").split("@")[0].split(/[._-]+/)[0];
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : "Unknown";
  }
  const nameByUser = new Map((profiles || []).map((p) => [p.id, firstNameFor(p)]));

  // "Active (7d)" tile — of all registered users, how many had at least one
  // recorded action in the last 7 days.
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const activeUserIds = new Set(
    (usageEvents || []).filter((e) => new Date(e.occurred_at).getTime() >= sevenDaysAgo).map((e) => e.user_id)
  );

  // Per-user usage % — the same "distinct active days in the last 30, out
  // of 30" formula as the personal Settings > Your activity tile, just
  // computed once per user here so each row carries its own number instead
  // of everyone sharing one combined tile at the top.
  const daysByUser = new Map<string, Set<string>>();
  for (const e of usageEvents || []) {
    const day = new Date(e.occurred_at).toDateString();
    const set = daysByUser.get(e.user_id) ?? new Set<string>();
    set.add(day);
    daysByUser.set(e.user_id, set);
  }
  const usagePercentByUser = new Map<string, number>(
    Array.from(daysByUser.entries()).map(([uid, days]) => [uid, Math.min(100, Math.round((days.size / 30) * 100))])
  );

  // Dedupe sign-ins to one row per user — logging in twice creates two
  // rows in sign_ins, which used to show as if there were two accounts.
  // The query above is already ordered newest-first, so the first time we
  // see a user_id here is their latest sign-in; we also count how many
  // sign-in events that user has in total.
  type SignInRow = NonNullable<typeof signIns>[number];
  const latestByUser = new Map<string, SignInRow>();
  const signInCountByUser = new Map<string, number>();
  for (const s of signIns || []) {
    if (!latestByUser.has(s.user_id)) latestByUser.set(s.user_id, s);
    signInCountByUser.set(s.user_id, (signInCountByUser.get(s.user_id) || 0) + 1);
  }

  const dedupedSignIns = Array.from(latestByUser.values())
    .sort((a, b) => new Date(b.signed_in_at).getTime() - new Date(a.signed_in_at).getTime())
    .map((s) => ({
      ...s,
      user_label: nameByUser.get(s.user_id) || "Unknown",
      sign_in_count: signInCountByUser.get(s.user_id) || 1,
      usage_percent: usagePercentByUser.get(s.user_id) || 0,
    }));

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    activeUsersLast7Days: activeUserIds.size,
    signIns: dedupedSignIns,
  });
}
