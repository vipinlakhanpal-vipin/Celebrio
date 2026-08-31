import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { isoDaysAgo } from "@/lib/date-utils";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;
  const thirtyDaysAgoIso = isoDaysAgo(30);

  const [{ data: profile }, { data: signIns }, { data: usageEvents }, { count: contactCount }, { data: occasionTypes }, { data: subscriptions }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("sign_ins")
        .select("*")
        .eq("user_id", userId)
        .order("signed_in_at", { ascending: false })
        .limit(10),
      supabase
        .from("usage_events")
        .select("occurred_at")
        .eq("user_id", userId)
        .gte("occurred_at", thirtyDaysAgoIso),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("occasion_types").select("*").order("name"),
      supabase.from("user_occasion_subscriptions").select("occasion_type_id, enabled").eq("user_id", userId),
    ]);

  const activeDays = new Set((usageEvents || []).map((e) => new Date(e.occurred_at).toDateString())).size;
  const usagePercent = Math.min(100, Math.round((activeDays / 30) * 100));

  const enabledMap = new Map((subscriptions || []).map((s) => [s.occasion_type_id, s.enabled]));
  const occasions = (occasionTypes || []).map((t) => ({
    ...t,
    subscribed: enabledMap.get(t.id) ?? t.default_enabled,
  }));

  return (
    <SettingsClient
      profile={profile}
      signIns={signIns || []}
      usagePercent={usagePercent}
      contactCount={contactCount ?? 0}
      occasions={occasions}
      isAdmin={!!profile?.is_admin}
    />
  );
}
