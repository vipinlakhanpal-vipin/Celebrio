import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const userId = user!.id;

  const [{ data: profile }, { count: contactCount }, { data: pendingApprovals }, { data: contacts }, { data: prompts }] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase
        .from("approvals")
        .select("*, contact:contacts(*)")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("occasion_date", { ascending: true })
        .limit(5),
      supabase.from("contacts").select("*").eq("user_id", userId),
      supabase
        .from("occasion_prompts")
        .select("*, occasion_type:occasion_types(*)")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("occasion_date", { ascending: true }),
    ]);

  return (
    <DashboardClient
      firstName={(profile?.full_name || user?.email?.split("@")[0] || "there").split(" ")[0]}
      contactCount={contactCount ?? 0}
      pendingApprovals={pendingApprovals || []}
      contacts={contacts || []}
      occasionPrompts={prompts || []}
    />
  );
}
