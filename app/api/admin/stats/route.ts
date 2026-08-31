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
      .limit(50),
    admin.from("usage_events").select("user_id, occurred_at").order("occurred_at", { ascending: false }).limit(2000),
  ]);

  const emailByUser = new Map((profiles || []).map((p) => [p.id, p.email || p.full_name || p.id.slice(0, 8)]));

  const enrichedSignIns = (signIns || []).map((s) => ({
    ...s,
    user_label: emailByUser.get(s.user_id) || "Unknown",
  }));

  // "App usage %" — of all registered users, how many had at least one
  // recorded action in the last 7 days.
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const activeUserIds = new Set(
    (usageEvents || []).filter((e) => new Date(e.occurred_at).getTime() >= sevenDaysAgo).map((e) => e.user_id)
  );
  const usagePercent = totalUsers ? Math.round((activeUserIds.size / totalUsers) * 100) : 0;

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    activeUsersLast7Days: activeUserIds.size,
    usagePercent,
    signIns: enrichedSignIns,
  });
}
