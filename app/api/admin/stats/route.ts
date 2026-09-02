import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

  const [{ data: profiles, count: totalUsers }, { data: signIns }, { data: usageEvents }] = await Promise.all([
    admin.from("profiles").select("id, email, full_name, created_at", { count: "exact" }),
    admin
      .from("sign_ins")
      .select("id, user_id, signed_in_at, city, region, country, device_type, ip_address")
      .order("signed_in_at", { ascending: false })
      .limit(200),
    admin.from("usage_events").select("user_id, occurred_at").order("occurred_at", { ascending: false }).limit(2000),
  ]);

  const emailByUser = new Map((profiles || []).map((p) => [p.id, p.email || p.full_name || p.id.slice(0, 8)]));

  // "App usage %" — of all registered users, how many had at least one
  // recorded action in the last 7 days.
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const activeUserIds = new Set(
    (usageEvents || []).filter((e) => new Date(e.occurred_at).getTime() >= sevenDaysAgo).map((e) => e.user_id)
  );
  const usagePercent = totalUsers ? Math.round((activeUserIds.size / totalUsers) * 100) : 0;

  // Per-user activity count in the last 7 days, so usage can be shown
  // against each individual user in the list below, not just as one
  // aggregate tile at the top.
  const eventCountByUser = new Map<string, number>();
  for (const e of usageEvents || []) {
    if (new Date(e.occurred_at).getTime() >= sevenDaysAgo) {
      eventCountByUser.set(e.user_id, (eventCountByUser.get(e.user_id) || 0) + 1);
    }
  }

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
      user_label: emailByUser.get(s.user_id) || "Unknown",
      sign_in_count: signInCountByUser.get(s.user_id) || 1,
      events_last_7d: eventCountByUser.get(s.user_id) || 0,
    }));

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    activeUsersLast7Days: activeUserIds.size,
    usagePercent,
    signIns: dedupedSignIns,
  });
}
