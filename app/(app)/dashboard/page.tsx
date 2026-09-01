import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

function titleCase(word: string) {
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

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

  // A real name (set on the new Settings > Your profile field) always wins.
  // Until someone sets one, fall back to their email's local part — split on
  // the common separators people use in an email address ("first.last",
  // "first_last") so a name-shaped local part still reads as a first name
  // instead of the whole string, and title-case either result so it never
  // renders in all lowercase.
  const rawFirstName =
    profile?.full_name && !profile.full_name.includes("@")
      ? profile.full_name.trim().split(" ")[0]
      : (user?.email?.split("@")[0] || "there").split(/[._-]+/)[0];

  return (
    <DashboardClient
      firstName={titleCase(rawFirstName)}
      contactCount={contactCount ?? 0}
      pendingApprovals={pendingApprovals || []}
      contacts={contacts || []}
      occasionPrompts={prompts || []}
    />
  );
}
