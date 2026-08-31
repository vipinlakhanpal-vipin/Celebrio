import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { isoDaysAgo } from "@/lib/date-utils";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  // Middleware already redirects signed-out visitors away from this route,
  // but never throw from a server component over it — show a recoverable
  // message instead of taking the whole request down with it.
  if (!user) {
    return (
      <div className="p-6 text-sm text-[var(--muted)]">
        Your session expired — please sign in again.
      </div>
    );
  }

  const userId = user.id;
  const thirtyDaysAgoIso = isoDaysAgo(30);

  // Promise.allSettled instead of Promise.all: one query failing (a network
  // blip, a timeout) no longer takes the entire page down with it — it just
  // falls back to an empty/default value for that one piece.
  const [profileRes, signInsRes, usageRes, contactCountRes, occasionTypesRes, subscriptionsRes] =
    await Promise.allSettled([
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

  const profile = profileRes.status === "fulfilled" ? profileRes.value.data : null;
  const signIns = signInsRes.status === "fulfilled" ? signInsRes.value.data : null;
  const usageEvents = usageRes.status === "fulfilled" ? usageRes.value.data : null;
  const contactCount = contactCountRes.status === "fulfilled" ? contactCountRes.value.count : null;
  const occasionTypes = occasionTypesRes.status === "fulfilled" ? occasionTypesRes.value.data : null;
  const subscriptions = subscriptionsRes.status === "fulfilled" ? subscriptionsRes.value.data : null;

  if (profileRes.status === "rejected") {
    console.error("[Celebrio] settings: profiles query rejected:", profileRes.reason);
  }

  const activeDays = new Set((usageEvents || []).map((e) => new Date(e.occurred_at).toDateString())).size;
  const usagePercent = Math.min(100, Math.round((activeDays / 30) * 100));

  const enabledMap = new Map((subscriptions || []).map((s) => [s.occasion_type_id, s.enabled]));
  const occasions = (occasionTypes || []).map((t) => ({
    ...t,
    subscribed: enabledMap.get(t.id) ?? t.default_enabled,
  }));

  // Normally the handle_new_user trigger creates this row the moment someone
  // signs up, but fall back to sensible defaults instead of crashing the page
  // if it's ever missing or the query above failed.
  const safeProfile = profile ?? {
    full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    email: user.email ?? null,
    notify_email: true,
    notify_whatsapp: true,
    notify_in_app: true,
    is_admin: false,
    created_at: user.created_at ?? new Date().toISOString(),
  };

  return (
    <SettingsClient
      profile={safeProfile}
      signIns={signIns || []}
      usagePercent={usagePercent}
      contactCount={contactCount ?? 0}
      occasions={occasions}
      isAdmin={!!safeProfile.is_admin}
    />
  );
}
